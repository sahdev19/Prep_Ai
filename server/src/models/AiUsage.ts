import { Schema, model } from 'mongoose';

// Per-user daily quota tracking to cap AI spend.
const aiUsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true }, // YYYY-MM-DD (UTC)
  requests: { type: Number, default: 0 },
  tokens: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
aiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiUsage = model('AiUsage', aiUsageSchema);
