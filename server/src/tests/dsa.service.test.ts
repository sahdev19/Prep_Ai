import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  DsaProblem: { find: vi.fn(), countDocuments: vi.fn(), create: vi.fn(), findOne: vi.fn(), deleteOne: vi.fn(), aggregate: vi.fn() },
}));
vi.mock('../models', () => m);

import { createProblem, deleteProblem, getStats, listProblems, updateProblem } from '../services/dsa.service';

const USER = '64b7f0f2a1b2c3d4e5f60718';
const chain = (rows: unknown[]) => {
  const c: Record<string, unknown> = {};
  for (const k of ['sort', 'skip', 'limit']) c[k] = vi.fn().mockReturnValue(c);
  c.lean = vi.fn().mockResolvedValue(rows);
  return c;
};

beforeEach(() => vi.clearAllMocks());

describe('listProblems', () => {
  it('scopes to the session user, applies filters, and paginates', async () => {
    const c = chain([{ _id: 'p1', title: 'Two Sum', topic: 'arrays', difficulty: 'easy', status: 'todo' }]);
    m.DsaProblem.find.mockReturnValue(c);
    m.DsaProblem.countDocuments.mockResolvedValue(45);
    const res = await listProblems(USER, { page: 3, limit: 20, topic: 'arrays' });
    expect(m.DsaProblem.find).toHaveBeenCalledWith({ userId: USER, topic: 'arrays' });
    expect(c.skip).toHaveBeenCalledWith(40);
    expect(c.limit).toHaveBeenCalledWith(20);
    expect(res).toMatchObject({ total: 45, page: 3, limit: 20 });
    expect(res.items[0]!.id).toBe('p1');
  });
});

describe('createProblem', () => {
  it('takes the owner from the session even if the input tries to override it', async () => {
    m.DsaProblem.create.mockImplementation(async (d) => ({ _id: 'p1', ...d }));
    await createProblem(USER, { title: 'T', topic: 'dp', difficulty: 'hard', userId: 'attacker' });
    expect(m.DsaProblem.create).toHaveBeenCalledWith(expect.objectContaining({ userId: USER }));
  });
  it('returns 409 on a duplicate', async () => {
    m.DsaProblem.create.mockRejectedValue({ code: 11000 });
    await expect(createProblem(USER, { title: 'T', topic: 'dp', difficulty: 'hard' })).rejects.toMatchObject({ status: 409 });
  });
  it('stamps solvedAt when created as solved', async () => {
    m.DsaProblem.create.mockImplementation(async (d) => ({ _id: 'p1', ...d }));
    const p = await createProblem(USER, { title: 'T', topic: 'dp', difficulty: 'hard', status: 'solved' });
    expect(p.solvedAt).toBeInstanceOf(Date);
  });
});

describe('updateProblem', () => {
  it('looks up by id AND owner; another user\'s problem is a 404', async () => {
    m.DsaProblem.findOne.mockResolvedValue(null);
    await expect(updateProblem(USER, 'p1', { notes: 'x' })).rejects.toMatchObject({ status: 404 });
    expect(m.DsaProblem.findOne).toHaveBeenCalledWith({ _id: 'p1', userId: USER });
  });
  it('sets solvedAt when moving to solved and clears it when moving away', async () => {
    const doc = { _id: 'p1', title: 'T', topic: 'dp', difficulty: 'easy', status: 'todo', solvedAt: undefined as Date | undefined, save: vi.fn() };
    m.DsaProblem.findOne.mockResolvedValue(doc);
    await updateProblem(USER, 'p1', { status: 'solved' });
    expect(doc.solvedAt).toBeInstanceOf(Date);
    await updateProblem(USER, 'p1', { status: 'revisit' });
    expect(doc.solvedAt).toBeUndefined();
    expect(doc.save).toHaveBeenCalledTimes(2);
  });
});

describe('deleteProblem', () => {
  it('404 when nothing was deleted for this owner', async () => {
    m.DsaProblem.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(deleteProblem(USER, 'p1')).rejects.toMatchObject({ status: 404 });
    expect(m.DsaProblem.deleteOne).toHaveBeenCalledWith({ _id: 'p1', userId: USER });
  });
});

describe('getStats', () => {
  it('aggregates counts by status, difficulty and topic', async () => {
    m.DsaProblem.aggregate.mockResolvedValue([
      { _id: { topic: 'arrays', difficulty: 'easy', status: 'solved' }, n: 4 },
      { _id: { topic: 'arrays', difficulty: 'hard', status: 'todo' }, n: 1 },
      { _id: { topic: 'dp', difficulty: 'medium', status: 'solved' }, n: 2 },
    ]);
    const s = await getStats(USER);
    expect(s.total).toBe(7);
    expect(s.solved).toBe(6);
    expect(s.byDifficulty.easy).toEqual({ total: 4, solved: 4 });
    expect(s.byTopic[0]).toEqual({ topic: 'arrays', total: 5, solved: 4 });
  });
});
