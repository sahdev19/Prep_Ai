import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  User: { findOne: vi.fn(), exists: vi.fn(), create: vi.fn(), findById: vi.fn() },
  RefreshToken: { create: vi.fn(), findOneAndUpdate: vi.fn(), findOne: vi.fn(), updateMany: vi.fn() },
  AuditLog: { create: vi.fn() },
}));
vi.mock('../models', () => m);

import { login, refresh, register } from '../services/auth.service';
import { hashPassword } from '../utils/passwords';

const ctx = { ip: '1.2.3.4', requestId: 'r1' };

beforeEach(() => {
  vi.clearAllMocks();
  m.AuditLog.create.mockResolvedValue({});
  m.RefreshToken.create.mockResolvedValue({});
});

describe('login', () => {
  it('gives the same generic error for unknown email and wrong password', async () => {
    m.User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    const unknown = await login({ email: 'x@y.com', password: 'whatever-1234' }, ctx).catch((e) => e);

    const passwordHash = await hashPassword('right-password-1');
    m.User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ id: 'u1', role: 'user', passwordHash }) });
    const wrong = await login({ email: 'x@y.com', password: 'wrong-password-1' }, ctx).catch((e) => e);

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.message).toBe(wrong.message);
    expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login_failed' }));
  });

  it('issues tokens and stores only a hashed refresh token on success', async () => {
    const passwordHash = await hashPassword('right-password-1');
    m.User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ id: 'u1', email: 'x@y.com', name: 'X', role: 'user', passwordHash }) });
    const res = await login({ email: 'x@y.com', password: 'right-password-1' }, ctx);
    expect(res.accessToken).toBeTruthy();
    const stored = m.RefreshToken.create.mock.calls[0]![0];
    expect(stored.tokenHash).not.toBe(res.refreshToken);
    expect(JSON.stringify(res.user)).not.toContain('passwordHash');
  });
});

describe('register', () => {
  it('returns 409 for an existing email', async () => {
    m.User.exists.mockResolvedValue({ _id: 'u1' });
    await expect(register({ email: 'x@y.com', password: 'longenough-1', name: 'X' }, ctx)).rejects.toMatchObject({ status: 409 });
    expect(m.User.create).not.toHaveBeenCalled();
  });
});

describe('refresh token rotation', () => {
  it('rotates within the same family on a valid token', async () => {
    m.RefreshToken.findOneAndUpdate.mockResolvedValue({ userId: 'u1', family: 'fam1' });
    m.User.findById.mockResolvedValue({ id: 'u1', role: 'user' });
    const res = await refresh('raw-token', ctx);
    expect(res.refreshToken).toBeTruthy();
    expect(m.RefreshToken.create).toHaveBeenCalledWith(expect.objectContaining({ family: 'fam1' }));
  });

  it('revokes the whole family when a used token is replayed', async () => {
    m.RefreshToken.findOneAndUpdate.mockResolvedValue(null);
    m.RefreshToken.findOne.mockResolvedValue({ userId: 'u1', family: 'fam1', revokedAt: new Date() });
    await expect(refresh('stolen-token', ctx)).rejects.toMatchObject({ status: 401 });
    expect(m.RefreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ family: 'fam1' }), expect.anything());
    expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.refresh_reuse_detected' }));
  });

  it('rejects unknown tokens without revoking anything', async () => {
    m.RefreshToken.findOneAndUpdate.mockResolvedValue(null);
    m.RefreshToken.findOne.mockResolvedValue(null);
    await expect(refresh('nope', ctx)).rejects.toMatchObject({ status: 401 });
    expect(m.RefreshToken.updateMany).not.toHaveBeenCalled();
  });
});
