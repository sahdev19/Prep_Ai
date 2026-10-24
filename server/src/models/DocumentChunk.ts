import { Schema, model } from 'mongoose';

const chunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'StudyDocument', required: true },
  ordinal: { type: Number, required: true },
  text: { type: String, required: true, maxlength: 4000 },
  page: Number,
  section: String,
  tokenCount: Number,
  embedding: { type: [Number], select: false }, // searched via Atlas vector index (see docs/DATABASE.md)
});
chunkSchema.index({ documentId: 1, ordinal: 1 }, { unique: true });

export const DocumentChunk = model('DocumentChunk', chunkSchema);
