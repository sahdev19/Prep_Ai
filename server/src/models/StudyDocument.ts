import { Schema, model } from 'mongoose';

// Admin-approved shared corpus only. User resumes are never indexed here.
const studyDocumentSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    topic: { type: String, required: true, maxlength: 80 },
    storageKey: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'indexing', 'indexed', 'failed', 'archived'], default: 'pending' },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
studyDocumentSchema.index({ status: 1, topic: 1 });

export const StudyDocument = model('StudyDocument', studyDocumentSchema);
