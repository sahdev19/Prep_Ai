import { env } from '../config/env';
import { AiUsage } from '../models';
import { AppError } from '../utils/AppError';

const today = () => new Date().toISOString().slice(0, 10);

// Atomic per-user daily counter that caps AI spend.
export async function consumeAiRequest(userId: string) {
  const doc = await AiUsage.findOneAndUpdate(
    { userId, day: today() },
    { $inc: { requests: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 3 * 86_400_000) } },
    { upsert: true, new: true },
  );
  if (doc.requests > env.AI_DAILY_REQUEST_LIMIT) {
    throw new AppError(429, 'QUOTA_EXCEEDED', `You have reached the daily limit of ${env.AI_DAILY_REQUEST_LIMIT} AI requests. It resets at midnight UTC.`);
  }
}

export async function addTokens(userId: string, tokens: number) {
  await AiUsage.updateOne({ userId, day: today() }, { $inc: { tokens } });
}
