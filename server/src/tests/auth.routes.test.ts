import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

const app = createApp();
const H = { 'X-Requested-With': 'prepai' };

describe('auth routes (no database needed)', () => {
  it('blocks state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects invalid registration input with VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register').set(H).send({ email: 'not-an-email', password: 'short', name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON with the standard error contract', async () => {
    const res = await request(app).post('/api/v1/auth/login').set(H).set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('protects /me from anonymous access', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('refresh without a cookie is 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set(H);
    expect(res.status).toBe(401);
  });
});
