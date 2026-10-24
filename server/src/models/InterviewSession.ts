import { Schema, model } from 'mongoose';

const questionSchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 1000 },
    answer: { type: String, maxlength: 5000 },
    feedback: {
      scores: { clarity: Number, correctness: Number, depth: Number }, // each 1-5
      strengths: [String],
      improvements: [String],
    },
  },
  { _id: true },
);

const interviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetRole: { type: String, required: true, maxlength: 100 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    questions: { type: [questionSchema], validate: (v: unknown[]) => v.length <= 15 },
    overall: { score: Number, summary: String, focusAreas: [String] },
  },
  { timestamps: true },
);
interviewSchema.index({ userId: 1, createdAt: -1 });

export const InterviewSession = model('InterviewSession', interviewSchema);
