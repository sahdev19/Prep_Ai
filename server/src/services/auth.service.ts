import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { RefreshToken, User } from '../models';
import { AppError } from '../utils/AppError';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../utils/passwords';
import { hashToken, newRefreshToken, signAccessToken, type Role } from '../utils/tokens';
import { audit } from './audit';

export interface Ctx {
  ip?: string;
  requestId?: string;
  userAgent?: string;
}

const invalid = () => new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');

async function issueTokens(user: { id?: string; role: Role }, family: string, ctx: Ctx) {
  const { token, hash } = newRefreshToken();
  await RefreshToken.create({
    userId: user.id as string,
    tokenHash: hash,
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    userAgent: ctx.userAgent?.slice(0, 300),
  });
  return { accessToken: signAccessToken({ sub: user.id as string, role: user.role }), refreshToken: token };
}

export const toPublic = (u: { id?: string; email: string; name: string; role: Role; profile?: unknown }) => ({
  id: u.id as string,
  email: u.email,
  name: u.name,
  role: u.role,
  profile: u.profile ?? {},
});

export async function register(input: { email: string; password: string; name: string }, ctx: Ctx) {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }
  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await User.create({ email: input.email, name: input.name, passwordHash });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
    throw err;
  }
  await audit('auth.register', { actorId: user.id, ip: ctx.ip, requestId: ctx.requestId });
  const tokens = await issueTokens(user, randomUUID(), ctx);
  return { user: toPublic(user), ...tokens };
}

export async function login(input: { email: string; password: string }, ctx: Ctx) {
  const user = await User.findOne({ email: input.email, deletedAt: { $exists: false } }).select('+passwordHash');
  // Always run one bcrypt comparison so timing does not reveal whether the email exists.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    await audit('auth.login_failed', { ip: ctx.ip, requestId: ctx.requestId });
    throw invalid();
  }
  await audit('auth.login', { actorId: user.id, ip: ctx.ip, requestId: ctx.requestId });
  const tokens = await issueTokens(user, randomUUID(), ctx);
  return { user: toPublic(user), ...tokens };
}

// Rotation: each refresh token is single-use. Presenting an already-used token means it was
// likely stolen, so the whole token family is revoked.
export async function refresh(rawToken: string, ctx: Ctx) {
  const hash = hashToken(rawToken);
  const now = new Date();
  const rotated = await RefreshToken.findOneAndUpdate(
    { tokenHash: hash, revokedAt: { $exists: false }, expiresAt: { $gt: now } },
    { revokedAt: now },
  );
  if (!rotated) {
    const existing = await RefreshToken.findOne({ tokenHash: hash });
    if (existing?.revokedAt) {
      await RefreshToken.updateMany({ family: existing.family, revokedAt: { $exists: false } }, { revokedAt: now });
      await audit('auth.refresh_reuse_detected', { actorId: String(existing.userId), ip: ctx.ip, requestId: ctx.requestId });
    }
    throw new AppError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again');
  }
  const user = await User.findById(rotated.userId);
  if (!user || user.deletedAt) throw new AppError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again');
  return issueTokens(user, rotated.family, ctx);
}

export async function logout(rawToken: string | undefined, ctx: Ctx) {
  if (!rawToken) return;
  const existing = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!existing) return;
  await RefreshToken.updateMany({ family: existing.family, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  await audit('auth.logout', { actorId: String(existing.userId), ip: ctx.ip, requestId: ctx.requestId });
}
