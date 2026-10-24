import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  Resume: { findById: vi.fn(), updateOne: vi.fn() },
  Job: { findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
  AiUsage: { updateOne: vi.fn() },
}));
vi.mock('../models', () => m);
vi.mock('../utils/extract', () => ({ extractText: vi.fn().mockResolvedValue('x'.repeat(300)), kindFromMime: () => 'pdf' }));

import { setLlmProvider } from '../ai/llm';
import { handleResumeAnalysis } from '../jobs/resumeAnalysis';
import { processJob } from '../jobs/worker';
import { setStorage } from '../storage';
import { AppError } from '../utils/AppError';

const analysis = { score: 70, breakdown: [{ category: 'Projects', score: 70, reason: 'ok' }], strengths: [], gaps: [], suggestions: [] };
const doc = (extra = {}) => ({ userId: 'u1', mimeType: 'application/pdf', storageKey: 'k', save: vi.fn(), ...extra }) as Record<string, unknown> & { save: ReturnType<typeof vi.fn> };
const select = (d: unknown) => m.Resume.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(d) });
const llm = (impl: ReturnType<typeof vi.fn>) => setLlmProvider({ modelName: 'fake', completeJson: impl } as never);

beforeEach(() => {
  vi.clearAllMocks();
  setStorage({ put: vi.fn(), get: vi.fn().mockResolvedValue(Buffer.from('%PDF-')), delete: vi.fn() });
});

describe('handleResumeAnalysis', () => {
  it('extracts, analyzes, and saves the validated result', async () => {
    const d = doc();
    select(d);
    llm(vi.fn().mockResolvedValue({ data: analysis, usage: { inputTokens: 5, outputTokens: 5 } }));
    await handleResumeAnalysis({ resumeId: 'r1' });
    expect(d.extractedText).toHaveLength(300);
    expect(d.status).toBe('analyzed');
    expect((d.analysis as { score: number }).score).toBe(70);
    expect(m.AiUsage.updateOne).toHaveBeenCalled();
  });

  it('skips silently if the resume was deleted while queued', async () => {
    select(null);
    await expect(handleResumeAnalysis({ resumeId: 'gone' })).resolves.toBeUndefined();
  });
});

describe('processJob retry policy', () => {
  const job = (attempts: number) => ({ _id: 'j1', type: 'resume_analysis', payload: { resumeId: 'r1' }, attempts });

  it('requeues with a future runAt when the provider is unavailable', async () => {
    select(doc());
    llm(vi.fn().mockRejectedValue(new AppError(503, 'AI_UNAVAILABLE', 'down')));
    await processJob(job(1));
    const update = m.Job.updateOne.mock.calls[0]![1];
    expect(update.status).toBe('queued');
    expect(update.runAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('fails permanently after the last attempt and marks the resume failed', async () => {
    select(doc());
    llm(vi.fn().mockRejectedValue(new AppError(503, 'AI_UNAVAILABLE', 'down')));
    await processJob(job(3));
    expect(m.Job.updateOne.mock.calls[0]![1].status).toBe('failed');
    expect(m.Resume.updateOne).toHaveBeenCalledWith({ _id: 'r1' }, { status: 'failed', errorCode: 'AI_UNAVAILABLE' });
  });

  it('does not retry unusable AI output', async () => {
    select(doc());
    llm(vi.fn().mockRejectedValue(new AppError(502, 'AI_INVALID_OUTPUT', 'bad')));
    await processJob(job(1));
    expect(m.Job.updateOne.mock.calls[0]![1].status).toBe('failed');
  });

  it('marks the job done on success', async () => {
    select(doc());
    llm(vi.fn().mockResolvedValue({ data: analysis, usage: { inputTokens: 1, outputTokens: 1 } }));
    await processJob(job(1));
    expect(m.Job.updateOne.mock.calls[0]![1].status).toBe('done');
  });
});
