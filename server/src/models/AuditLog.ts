import { Schema, model } from 'mongoose';

// Security-relevant events only. Never store passwords, tokens, or document content.
const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // e.g. auth.login_failed, admin.document_upload
  targetType: String,
  targetId: String,
  ip: String,
  requestId: String,
  createdAt: { type: Date, default: Date.now },
});
auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // 1-year retention

export const AuditLog = model('AuditLog', auditSchema);
