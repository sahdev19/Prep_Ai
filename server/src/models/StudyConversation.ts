import { Schema, model } from 'mongoose';

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 6000 },
    sufficientEvidence: Boolean,
    // Citations always reference real retrieved chunks.
    citations: [{ chunkId: Schema.Types.ObjectId, documentId: Schema.Types.ObjectId, page: Number }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, maxlength: 120 },
    messages: { type: [messageSchema], validate: (v: unknown[]) => v.length <= 100 },
  },
  { timestamps: true },
);
conversationSchema.index({ userId: 1, updatedAt: -1 });

export const StudyConversation = model('StudyConversation', conversationSchema);
