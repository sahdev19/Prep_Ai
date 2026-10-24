import { RefreshToken, User } from '../models';
import { AppError } from '../utils/AppError';
import { audit } from './audit';
import { toPublic, type Ctx } from './auth.service';

async function activeUser(id: string) {
  const user = await User.findById(id);
  if (!user || user.deletedAt) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');
  return user;
}

export async function getMe(id: string) {
  return toPublic(await activeUser(id));
}

export async function updateMe(id: string, input: { name?: string; targetRole?: string; college?: string; graduationYear?: number }) {
  const { name, ...profile } = input;
  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name;
  for (const [k, v] of Object.entries(profile)) set[`profile.${k}`] = v;
  const user = await User.findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, { $set: set }, { new: true });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');
  return toPublic(user);
}

// Soft delete now; a scheduled purge removes the user's data within the retention window.
export async function requestDeletion(id: string, ctx: Ctx) {
  await activeUser(id);
  const now = new Date();
  await User.updateOne({ _id: id }, { deletedAt: now });
  await RefreshToken.updateMany({ userId: id, revokedAt: { $exists: false } }, { revokedAt: now });
  await audit('user.delete_requested', { actorId: id, ip: ctx.ip, requestId: ctx.requestId });
}
