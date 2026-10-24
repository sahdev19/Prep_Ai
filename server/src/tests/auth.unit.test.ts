import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authenticate, requireRole } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../utils/passwords';
import { hashToken, newRefreshToken, signAccessToken, verifyAccessToken } from '../utils/tokens';

describe('passwords', () => {
  it('hashes (never stores plaintext) and verifies', async () => {
    const h = await hashPassword('correct-horse-1');
    expect(h).not.toContain('correct-horse-1');
    expect(await verifyPassword('correct-horse-1', h)).toBe(true);
    expect(await verifyPassword('wrong-password', h)).toBe(false);
  });
});

describe('tokens', () => {
  it('round-trips a valid access token', () => {
    const t = signAccessToken({ sub: 'u1', role: 'user' });
    expect(verifyAccessToken(t)).toEqual({ sub: 'u1', role: 'user' });
  });
  it('rejects tampered, wrong-secret, and expired tokens', () => {
    const t = signAccessToken({ sub: 'u1', role: 'user' });
    expect(() => verifyAccessToken(t.slice(0, -2) + 'xx')).toThrow();
    expect(() => verifyAccessToken(jwt.sign({ sub: 'u1', role: 'admin' }, 'a-different-secret-of-32-chars-or-more!!'))).toThrow();
    expect(() => verifyAccessToken(jwt.sign({ sub: 'u1', role: 'user' }, 'test-secret-test-secret-test-secret-123', { expiresIn: -10 }))).toThrow();
  });
  it('rejects a token with an unexpected role', () => {
    const t = jwt.sign({ sub: 'u1', role: 'superuser' }, 'test-secret-test-secret-test-secret-123');
    expect(() => verifyAccessToken(t)).toThrow();
  });
  it('refresh tokens are random and stored only as hashes', () => {
    const a = newRefreshToken();
    const b = newRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toBe(a.token);
  });
});

describe('authenticate / requireRole', () => {
  const app = express();
  app.use(cookieParser());
  app.get('/user', authenticate, (req, res) => void res.json(req.user));
  app.get('/admin', authenticate, requireRole('admin'), (_req, res) => void res.json({ ok: true }));
  app.use(errorHandler);

  const cookie = (role: 'user' | 'admin') => `access_token=${signAccessToken({ sub: 'u1', role })}`;

  it('401 without a cookie', async () => {
    expect((await request(app).get('/user')).status).toBe(401);
  });
  it('allows a valid session', async () => {
    const res = await request(app).get('/user').set('Cookie', cookie('user'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'u1', role: 'user' });
  });
  it('403 when a normal user hits an admin route', async () => {
    expect((await request(app).get('/admin').set('Cookie', cookie('user'))).status).toBe(403);
  });
  it('admin can access admin routes', async () => {
    expect((await request(app).get('/admin').set('Cookie', cookie('admin'))).status).toBe(200);
  });
  it('401 for a garbage token', async () => {
    expect((await request(app).get('/user').set('Cookie', 'access_token=garbage')).status).toBe(401);
  });
});
