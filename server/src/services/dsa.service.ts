import { Types } from 'mongoose';
import { DsaProblem } from '../models';
import { AppError } from '../utils/AppError';

interface DsaFields {
  _id: unknown;
  title: string;
  platform?: string | null;
  url?: string | null;
  topic: string;
  difficulty: string;
  status?: string | null;
  notes?: string | null;
  solvedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const toDto = (d: DsaFields) => ({
  id: String(d._id),
  title: d.title,
  platform: d.platform,
  url: d.url ?? null,
  topic: d.topic,
  difficulty: d.difficulty,
  status: d.status,
  notes: d.notes ?? null,
  solvedAt: d.solvedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

const notFound = () => new AppError(404, 'NOT_FOUND', 'Problem not found');
const duplicate = () => new AppError(409, 'CONFLICT', 'You already track this problem on this platform');
const isDuplicateKey = (e: unknown) => (e as { code?: number }).code === 11000;

// Every query below is scoped by userId taken from the verified session, never from the request body.

export async function listProblems(
  userId: string,
  q: { page: number; limit: number; topic?: string; difficulty?: string; status?: string },
) {
  const filter: Record<string, unknown> = { userId };
  for (const k of ['topic', 'difficulty', 'status'] as const) if (q[k]) filter[k] = q[k];
  const [items, total] = await Promise.all([
    DsaProblem.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    DsaProblem.countDocuments(filter),
  ]);
  return { items: items.map(toDto), page: q.page, limit: q.limit, total };
}

export async function createProblem(userId: string, input: Record<string, unknown>) {
  try {
    const solvedAt = input.status === 'solved' ? new Date() : undefined;
    return toDto(await DsaProblem.create({ ...input, userId, solvedAt }));
  } catch (e) {
    if (isDuplicateKey(e)) throw duplicate();
    throw e;
  }
}

export async function updateProblem(userId: string, id: string, input: Record<string, unknown>) {
  const doc = await DsaProblem.findOne({ _id: id, userId });
  if (!doc) throw notFound(); // same response whether it does not exist or belongs to someone else
  const wasSolved = doc.status === 'solved';
  Object.assign(doc, input);
  if (input.status === 'solved' && !wasSolved) doc.solvedAt = new Date();
  if (input.status && input.status !== 'solved') doc.solvedAt = undefined;
  try {
    await doc.save();
  } catch (e) {
    if (isDuplicateKey(e)) throw duplicate();
    throw e;
  }
  return toDto(doc);
}

export async function deleteProblem(userId: string, id: string) {
  const res = await DsaProblem.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw notFound();
}

export async function getStats(userId: string) {
  // One bounded aggregation: at most topics x difficulties x statuses groups.
  const rows = await DsaProblem.aggregate<{ _id: { topic: string; difficulty: string; status: string }; n: number }>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: { topic: '$topic', difficulty: '$difficulty', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const byStatus: Record<string, number> = { todo: 0, attempted: 0, solved: 0, revisit: 0 };
  const byDifficulty: Record<string, { total: number; solved: number }> = {
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  };
  const topics = new Map<string, { topic: string; total: number; solved: number }>();
  let total = 0;
  for (const { _id: g, n } of rows) {
    const solved = g.status === 'solved' ? n : 0;
    total += n;
    byStatus[g.status] = (byStatus[g.status] ?? 0) + n;
    const d = byDifficulty[g.difficulty];
    if (d) {
      d.total += n;
      d.solved += solved;
    }
    const t = topics.get(g.topic) ?? { topic: g.topic, total: 0, solved: 0 };
    t.total += n;
    t.solved += solved;
    topics.set(g.topic, t);
  }
  return { total, solved: byStatus.solved ?? 0, byStatus, byDifficulty, byTopic: [...topics.values()].sort((a, b) => b.total - a.total) };
}
