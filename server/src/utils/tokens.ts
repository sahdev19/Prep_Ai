import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type Role = 'user' | 'admin';
export interface AccessPayload {
  sub: string;
  role: Role;
}

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { algorithm: 'HS256', expiresIn: env.ACCESS_TOKEN_TTL_MIN * 60 });

// Throws on bad signature, wrong algorithm, expiry, or unexpected payload shape.
export function verifyAccessToken(token: string): AccessPayload {
  const d = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  if (typeof d === 'string' || typeof d.sub !== 'string' || (d.role !== 'user' && d.role !== 'admin')) {
    throw new Error('Invalid token payload');
  }
  return { sub: d.sub, role: d.role };
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Opaque random refresh token; only its hash is ever stored.
export function newRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}
