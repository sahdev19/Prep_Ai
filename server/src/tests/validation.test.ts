import { describe, expect, it } from 'vitest';
import { registerBody } from '../validation/auth';
import { createDsaBody, listDsaQuery, updateDsaBody } from '../validation/dsa';
import { ragAnswerOutput, resumeAnalysisOutput } from '../validation/ai';
import { pagination } from '../validation/common';

describe('request validation', () => {
  it('normalizes email and rejects short passwords', () => {
    expect(registerBody.parse({ email: ' A@B.com ', password: 'longenough1', name: 'Asha' }).email).toBe('a@b.com');
    expect(registerBody.safeParse({ email: 'a@b.com', password: 'short', name: 'Asha' }).success).toBe(false);
  });

  it('rejects unknown fields (mass-assignment guard)', () => {
    const r = createDsaBody.safeParse({ title: 'Two Sum', topic: 'arrays', difficulty: 'easy', userId: 'x' });
    expect(r.success).toBe(false);
  });

  it('partial updates never inject create-time defaults', () => {
    expect(updateDsaBody.parse({ notes: 'revise' })).toEqual({ notes: 'revise' });
    expect(updateDsaBody.safeParse({}).success).toBe(false);
    expect(createDsaBody.parse({ title: 'T', topic: 'dp', difficulty: 'hard' })).toMatchObject({ platform: 'other', status: 'todo' });
  });

  it('caps page size to keep result sets bounded', () => {
    expect(pagination.safeParse({ limit: '500' }).success).toBe(false);
    expect(listDsaQuery.parse({}).limit).toBe(20);
  });
});

describe('AI output validation', () => {
  it('rejects out-of-range scores from the model', () => {
    const bad = { score: 140, breakdown: [{ category: 'x', score: 50, reason: 'y' }], strengths: [], gaps: [], suggestions: [] };
    expect(resumeAnalysisOutput.safeParse(bad).success).toBe(false);
  });

  it('requires an explicit evidence flag on RAG answers', () => {
    expect(ragAnswerOutput.safeParse({ answer: 'x', citedChunkIds: [] }).success).toBe(false);
    expect(ragAnswerOutput.safeParse({ sufficientEvidence: false, answer: 'Not enough evidence.', citedChunkIds: [] }).success).toBe(true);
  });
});
