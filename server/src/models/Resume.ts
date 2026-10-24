import { Schema, model } from 'mongoose';

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storageKey: { type: String, required: true }, // private bucket key, never a public URL
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], required: true },
    sizeBytes: { type: Number, required: true, max: 5 * 1024 * 1024 },
    sha256: { type: String, required: true },
    extractedText: { type: String, select: false }, // sensitive: excluded from default queries and logs
    status: { type: String, enum: ['uploaded', 'processing', 'analyzed', 'failed'], default: 'uploaded' },
    analysis: {
      score: { type: Number, min: 0, max: 100 }, // an estimate, not a hiring prediction
      breakdown: [{ category: String, score: Number, reason: String }],
      strengths: [String],
      gaps: [String],
      suggestions: [String],
      model: String,
      analyzedAt: Date,
    },
    errorCode: String,
  },
  { timestamps: true },
);
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, sha256: 1 }, { unique: true }); // duplicate upload guard

export const Resume = model('Resume', resumeSchema);
