import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { getLlm } from '../ai/llm';
import { Job, Resume } from '../models';
import { getStorage } from '../storage';
import { AppError } from '../utils/AppError';
import { detectFileType, kindFromMime, MIME } from '../utils/extract';
import { logger } from '../utils/logger';
import { audit } from './audit';
import type { Ctx } from './auth.service';
import { consumeAiRequest } from './quota';

export const DISCLAIMER = 'This is an AI-generated estimate of resume quality. It is not a prediction of hiring outcomes.';

interface ResumeFields {
  _id: unknown; originalName: string; sizeBytes: number; status?: string | null; errorCode?: string | null; createdAt?: Date;
  analysis?: {
    score?: number | null; strengths?: string[]; gaps?: string[]; suggestions?: string[]; analyzedAt?: Date | null;
    breakdown?: { category?: string | null; score?: number | null; reason?: string | null }[];
  } | null;
}

// The storage key and extracted text are never exposed to clients.
export const toDto = (r: ResumeFields) => ({
  id: String(r._id),
  originalName: r.originalName,
  sizeBytes: r.sizeBytes,
  status: r.status,
  errorCode: r.errorCode ?? null,
  createdAt: r.createdAt,
  analysis:
    r.analysis?.score != null
      ? {
          score: r.analysis.score,
          breakdown: (r.analysis.breakdown ?? []).map((b) => ({ category: b.category, score: b.score, reason: b.reason })),
          strengths: r.analysis.strengths ?? [],
          gaps: r.analysis.gaps ?? [],
          suggestions: r.analysis.suggestions ?? [],
          analyzedAt: r.analysis.analyzedAt ?? null,
          disclaimer: DISCLAIMER,
        }
      : null,
});

const notFound = () => new AppError(404, 'NOT_FOUND', 'Resume not found');
const cleanName = (n: string) => basename(n).replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').slice(0, 255) || 'resume';

export async function uploadResume(userId: string, file: { buffer: Buffer; mimetype: string; originalname: string }, ctx: Ctx) {
  const kind = detectFileType(file.buffer);
  if (!kind || kind !== kindFromMime(file.mimetype)) {
    throw new AppError(400, 'FILE_INVALID', 'The file content does not match a PDF or .docx document.');
  }
  getLlm(); // fail fast if AI is not configured, before accepting a file we cannot process
  const storage = getStorage();

  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  const duplicate = () => new AppError(409, 'CONFLICT', 'You have already uploaded this file.');
  if (await Resume.exists({ userId, sha256 })) throw duplicate();

  await consumeAiRequest(userId);

  const storageKey = `resumes/${userId}/${randomUUID()}.${kind}`;
  await storage.put(storageKey, file.buffer, MIME[kind]);
  let resume;
  try {
    resume = await Resume.create({
      userId, storageKey, sha256, originalName: cleanName(file.originalname), mimeType: MIME[kind], sizeBytes: file.buffer.length,
    });
  } catch (err) {
    try {
      await storage.delete(storageKey);
    } catch (e) {
      logger.error({ err: e }, 'Orphan cleanup failed');
    }
    if ((err as { code?: number }).code === 11000) throw duplicate();
    throw err;
  }
  await Job.create({ type: 'resume_analysis', userId, payload: { resumeId: String(resume._id) }, idempotencyKey: `resume_analysis:${resume._id}` });
  await audit('resume.upload', { actorId: userId, targetType: 'resume', targetId: String(resume._id), ip: ctx.ip, requestId: ctx.requestId });
  return toDto(resume);
}

export async function listResumes(userId: string, q: { page: number; limit: number }) {
  const [items, total] = await Promise.all([
    Resume.find({ userId }).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Resume.countDocuments({ userId }),
  ]);
  return { items: items.map(toDto), page: q.page, limit: q.limit, total };
}

export async function getResume(userId: string, id: string) {
  const r = await Resume.findOne({ _id: id, userId }).lean();
  if (!r) throw notFound();
  return toDto(r);
}

export async function deleteResume(userId: string, id: string, ctx: Ctx) {
  const r = await Resume.findOne({ _id: id, userId });
  if (!r) throw notFound();
  // Delete the stored file first; if that fails the record stays so the user can retry.
  await getStorage().delete(r.storageKey);
  await Job.deleteMany({ idempotencyKey: `resume_analysis:${id}`, status: 'queued' });
  await Resume.deleteOne({ _id: id, userId });
  await audit('resume.delete', { actorId: userId, targetType: 'resume', targetId: id, ip: ctx.ip, requestId: ctx.requestId });
}
