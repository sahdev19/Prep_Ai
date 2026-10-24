import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: {
      targetRole: { type: String, trim: true, maxlength: 100 },
      college: { type: String, trim: true, maxlength: 150 },
      graduationYear: { type: Number, min: 2000, max: 2100 },
    },
    deletedAt: { type: Date }, // soft-delete marker; hard purge runs after the retention window
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
