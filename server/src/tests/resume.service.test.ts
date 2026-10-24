import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  Resume: { exists: vi.fn(), create: vi.fn(), find: vi.fn(), countDocuments: vi.fn(), findOne: vi.fn(), deleteOne: vi.fn() },
  Job: { create: vi.fn(), deleteMany: vi.fn() },
  AiUsage: { findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
  AuditLog: { create: vi.fn() },
}));
vi.mock('../models', () => m);

import { setLlmProvider } from '../ai/llm';
import { deleteResume, getResume, uploadResume } from '../services/resume.service';
import { setStorage } from '../storage';

const USER = '64b7f0f2a1b2c3d4e5f60718';
const ctx = { ip: '1.1.1.1', requestId: 'r' };
const storage = { put: vi.fn(), get: vi.fn(), delete: vi.fn() };
const pdf = { buffer: Buffer.from('%PDF-1.7 resume bytes'), mimetype: 'application/pdf', originalname: '../../evil\x00name.pdf' };

beforeEach(() => {
  vi.clearAllMocks();
  setStorage(storage);
  setLlmProvider({ modelName: 'fake', completeJson: vi.fn() } as never);
  m.AiUsage.findOneAndUpdate.mockResolvedValue({ requests: 1 });
  m.Resume.exists.mockResolvedValue(null);
  m.Resume.create.mockImplementation(async (d) => ({ _id: 'r1', status: 'uploaded', ...d }));
  m.AuditLog.create.mockResolvedValue({});
});

describe('uploadResume', () => {
  it('rejects a file whose bytes do not match, before touching quota or storage', async () => {
    await expect(uploadResume(USER, { ...pdf, buffer: Buffer.from('MZ not a pdf') }, ctx)).rejects.toMatchObject({ code: 'FILE_INVALID' });
    expect(m.AiUsage.findOneAndUpdate).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects a declared type that disagrees with the content', async () => {
    await expect(uploadResume(USER, { ...pdf, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, ctx)).rejects.toMatchObject({ code: 'FILE_INVALID' });
  });

  it('blocks with 429 when the daily AI quota is used up, without storing the file', async () => {
    m.AiUsage.findOneAndUpdate.mockResolvedValue({ requests: 999 });
    await expect(uploadResume(USER, pdf, ctx)).rejects.toMatchObject({ status: 429, code: 'QUOTA_EXCEEDED' });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate upload and does not spend quota', async () => {
    m.Resume.exists.mockResolvedValue({ _id: 'old' });
    await expect(uploadResume(USER, pdf, ctx)).rejects.toMatchObject({ status: 409 });
    expect(m.AiUsage.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stores under the user prefix, queues a job, and never exposes the storage key', async () => {
    const dto = await uploadResume(USER, pdf, ctx);
    const key = storage.put.mock.calls[0]![0] as string;
    expect(key.startsWith(`resumes/${USER}/`)).toBe(true);
    expect(m.Job.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'resume_analysis', idempotencyKey: 'resume_analysis:r1' }));
    expect(JSON.stringify(dto)).not.toContain('resumes/');
    expect(dto.originalName).toBe('evilname.pdf');
    expect(dto.status).toBe('uploaded');
  });

  it('cleans up the stored file if the database write fails on a duplicate race', async () => {
    m.Resume.create.mockRejectedValue({ code: 11000 });
    await expect(uploadResume(USER, pdf, ctx)).rejects.toMatchObject({ status: 409 });
    expect(storage.delete).toHaveBeenCalled();
  });

  it('fails fast with 503 when AI is not configured', async () => {
    setLlmProvider(null);
    await expect(uploadResume(USER, pdf, ctx)).rejects.toMatchObject({ status: 503 });
    expect(storage.put).not.toHaveBeenCalled();
  });
});

describe('ownership and deletion', () => {
  it('only finds resumes owned by the caller', async () => {
    m.Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    await expect(getResume(USER, 'r1')).rejects.toMatchObject({ status: 404 });
    expect(m.Resume.findOne).toHaveBeenCalledWith({ _id: 'r1', userId: USER });
  });

  it('deletes the stored file, then the record', async () => {
    m.Resume.findOne.mockResolvedValue({ storageKey: `resumes/${USER}/a.pdf` });
    await deleteResume(USER, 'r1', ctx);
    expect(storage.delete).toHaveBeenCalledWith(`resumes/${USER}/a.pdf`);
    expect(m.Resume.deleteOne).toHaveBeenCalledWith({ _id: 'r1', userId: USER });
  });

  it('keeps the record if file deletion fails, so the user can retry', async () => {
    m.Resume.findOne.mockResolvedValue({ storageKey: 'k' });
    storage.delete.mockRejectedValueOnce(new Error('s3 down'));
    await expect(deleteResume(USER, 'r1', ctx)).rejects.toThrow();
    expect(m.Resume.deleteOne).not.toHaveBeenCalled();
  });
});
