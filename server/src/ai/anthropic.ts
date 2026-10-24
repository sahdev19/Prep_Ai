import Anthropic from '@anthropic-ai/sdk';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { LlmProvider, Usage } from './llm';

interface MessagesClient {
  messages: {
    create(args: Record<string, unknown>): Promise<{
      content: { type: string; text?: string }[];
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export function parseJsonObject(text: string): { ok: true; value: unknown } | { ok: false } {
  const t = text.replace(/```(?:json)?/gi, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(t.slice(start, end + 1)) };
  } catch {
    return { ok: false };
  }
}

function mapProviderError(err: unknown): AppError {
  const status = (err as { status?: number }).status;
  // Never log request content; status is enough to diagnose (401 = bad key, 429 = rate limit, 5xx = outage).
  logger.error({ status, name: (err as Error).name }, 'LLM provider call failed');
  return new AppError(503, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable. Please try again shortly.');
}

export class AnthropicProvider implements LlmProvider {
  constructor(private client: MessagesClient, readonly modelName: string) {}

  async completeJson<T>({ system, user, schema, maxTokens }: { system: string; user: string; schema: ZodType<T>; maxTokens: number }) {
    const usage: Usage = { inputTokens: 0, outputTokens: 0 };
    let issue = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = attempt === 0 ? user : `${user}\n\nYour previous reply was rejected (${issue}). Reply with ONLY the JSON object.`;
      let res;
      try {
        res = await this.client.messages.create({ model: this.modelName, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] });
      } catch (err) {
        throw mapProviderError(err);
      }
      usage.inputTokens += res.usage.input_tokens;
      usage.outputTokens += res.usage.output_tokens;
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
      const parsed = parseJsonObject(text);
      if (!parsed.ok) {
        issue = 'not valid JSON';
        continue;
      }
      const check = schema.safeParse(parsed.value);
      if (check.success) return { data: check.data, usage };
      issue = check.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    }
    throw new AppError(502, 'AI_INVALID_OUTPUT', 'The AI returned an unusable response.');
  }
}

// 30 s timeout per call; the SDK retries connection errors, 429s and 5xx up to 2 times with backoff.
export const createAnthropicProvider = (apiKey: string, model: string) =>
  new AnthropicProvider(new Anthropic({ apiKey, timeout: 30_000, maxRetries: 2 }) as unknown as MessagesClient, model);
