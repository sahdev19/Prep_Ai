import type { ZodType } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface Usage { inputTokens: number; outputTokens: number }

// Provider-independent interface: swap Anthropic for another LLM without touching features.
export interface LlmProvider {
  completeJson<T>(args: { system: string; user: string; schema: ZodType<T>; maxTokens: number }): Promise<{ data: T; usage: Usage }>;
  readonly modelName: string;
}

let provider: LlmProvider | null = null;
export const setLlmProvider = (p: LlmProvider | null) => {
  provider = p;
};

export function getLlm(): LlmProvider {
  if (provider) return provider;
  if (!env.ANTHROPIC_API_KEY) throw new AppError(503, 'AI_UNAVAILABLE', 'AI features are not configured on this server.');
  // Loaded lazily so the SDK is only needed when AI is actually used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createAnthropicProvider } = require('./anthropic') as typeof import('./anthropic');
  provider = createAnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  return provider;
}
