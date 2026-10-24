import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { signAccessToken } from '../utils/tokens';

const app = createApp();
const H = { 'X-Requested-With': 'prepai' };
const cookie = `access_token=${signAccessToken({ sub: '64b7f0f2a1b2c3d4e5f60718', role: 'user' })}`;

describe('resume routes: access control and upload validation (no database needed)', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/v1/resumes')).status).toBe(401);
    expect((await request(app).post('/api/v1/resumes').set(H)).status).toBe(401);
  });
  it('requires a file', async () => {
    const res = await request(app).post('/api/v1/resumes').set(H).set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('rejects non-document types', async () => {
    const res = await request(app).post('/api/v1/resumes').set(H).set('Cookie', cookie).attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_INVALID');
  });
  it('rejects files over 5 MB', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await request(app).post('/api/v1/resumes').set(H).set('Cookie', cookie).attach('file', big, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/5 MB/);
  });
  it('rejects malformed ids', async () => {
    expect((await request(app).get('/api/v1/resumes/xyz').set('Cookie', cookie)).status).toBe(400);
  });
});
