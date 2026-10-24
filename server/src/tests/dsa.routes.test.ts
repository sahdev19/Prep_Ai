import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { signAccessToken } from '../utils/tokens';

const app = createApp();
const H = { 'X-Requested-With': 'prepai' };
const cookie = `access_token=${signAccessToken({ sub: '64b7f0f2a1b2c3d4e5f60718', role: 'user' })}`;
const valid = { title: 'Two Sum', topic: 'arrays', difficulty: 'easy' };

describe('DSA routes: access control and validation (no database needed)', () => {
  it('requires login for every route', async () => {
    expect((await request(app).get('/api/v1/dsa')).status).toBe(401);
    expect((await request(app).get('/api/v1/dsa/stats')).status).toBe(401);
    expect((await request(app).post('/api/v1/dsa').set(H).send(valid)).status).toBe(401);
    expect((await request(app).delete('/api/v1/dsa/64b7f0f2a1b2c3d4e5f60718').set(H)).status).toBe(401);
  });

  it('rejects oversized page limits', async () => {
    const res = await request(app).get('/api/v1/dsa?limit=500').set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown filter values', async () => {
    expect((await request(app).get('/api/v1/dsa?status=hacked').set('Cookie', cookie)).status).toBe(400);
  });

  it('blocks mass assignment of userId', async () => {
    const res = await request(app).post('/api/v1/dsa').set(H).set('Cookie', cookie).send({ ...valid, userId: 'someone-else' });
    expect(res.status).toBe(400);
  });

  it('rejects javascript: URLs', async () => {
    const res = await request(app).post('/api/v1/dsa').set(H).set('Cookie', cookie).send({ ...valid, url: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it('rejects malformed ids and empty updates', async () => {
    expect((await request(app).patch('/api/v1/dsa/not-an-id').set(H).set('Cookie', cookie).send({ notes: 'x' })).status).toBe(400);
    expect((await request(app).patch('/api/v1/dsa/64b7f0f2a1b2c3d4e5f60718').set(H).set('Cookie', cookie).send({})).status).toBe(400);
  });
});
