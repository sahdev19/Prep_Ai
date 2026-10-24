import { Schema, model } from 'mongoose';

const jobMatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    jobTitle: { type: String, required: true, maxlength: 150 },
    jobDescription: { type: String, required: true, maxlength: 8000 },
    status: { type: String, enum: ['processing', 'done', 'failed'], default: 'processing' },
    result: {
      score: { type: Number, min: 0, max: 100 },
      matchedSkills: [String],
      missingSkills: [String],
      suggestions: [String],
      explanation: String,
    },
  },
  { timestamps: true },
);
jobMatchSchema.index({ userId: 1, createdAt: -1 });

export const JobMatch = model('JobMatch', jobMatchSchema);
