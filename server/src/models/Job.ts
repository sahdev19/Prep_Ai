import { Schema, model } from 'mongoose';

// Mongo-backed queue for long-running AI work (Redis deferred until load requires it).
const jobSchema = new Schema(
  {
    type: { type: String, enum: ['resume_analysis', 'job_match', 'document_ingest'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued' },
    attempts: { type: Number, default: 0, max: 3 },
    runAt: { type: Date, default: Date.now },
    lockedAt: Date,
    lastError: { type: String, maxlength: 500 },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);
jobSchema.index({ status: 1, runAt: 1 });
jobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Job = model('Job', jobSchema);
