import { Schema, model } from 'mongoose';

export const DSA_TOPICS = ['arrays', 'strings', 'linked-list', 'stack-queue', 'trees', 'graphs', 'dp', 'greedy', 'recursion', 'sorting-searching', 'hashing', 'other'] as const;

const dsaSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    platform: { type: String, enum: ['leetcode', 'gfg', 'codeforces', 'hackerrank', 'other'], default: 'other' },
    url: { type: String, maxlength: 500 },
    topic: { type: String, enum: DSA_TOPICS, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    status: { type: String, enum: ['todo', 'attempted', 'solved', 'revisit'], default: 'todo' },
    notes: { type: String, maxlength: 2000 },
    solvedAt: Date,
  },
  { timestamps: true },
);
dsaSchema.index({ userId: 1, status: 1, topic: 1 });
dsaSchema.index({ userId: 1, platform: 1, title: 1 }, { unique: true });

export const DsaProblem = model('DsaProblem', dsaSchema);
