import { Job, Resume } from '../models';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { handleResumeAnalysis } from './resumeAnalysis';

export const MAX_ATTEMPTS = 3;
const STALE_MS = 5 * 60_000;

type JobDoc = { _id: unknown; type: string; payload: unknown; attempts: number };

export async function claimNext(): Promise<JobDoc | null> {
  const now = new Date();
  return Job.findOneAndUpdate(
    { $or: [{ status: 'queued', runAt: { $lte: now } }, { status: 'running', lockedAt: { $lt: new Date(now.getTime() - STALE_MS) } }] },
    { status: 'running', lockedAt: now, $inc: { attempts: 1 } },
    { sort: { runAt: 1 }, new: true },
  );
}

async function run(job: JobDoc) {
  if (job.type === 'resume_analysis') return handleResumeAnalysis(job.payload as { resumeId: string });
  throw new Error(`Unknown job type ${job.type}`);
}

async function markFinalFailure(job: JobDoc, code: string) {
  await Job.updateOne({ _id: job._id }, { status: 'failed', lastError: code });
  if (job.type === 'resume_analysis') {
    await Resume.updateOne({ _id: (job.payload as { resumeId: string }).resumeId }, { status: 'failed', errorCode: code });
  }
}

export async function processJob(job: JobDoc) {
  try {
    if (job.attempts > MAX_ATTEMPTS) throw new AppError(503, 'AI_UNAVAILABLE', 'Too many attempts');
    await run(job);
    await Job.updateOne({ _id: job._id }, { status: 'done', lastError: undefined });
  } catch (err) {
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
    if (!(err instanceof AppError)) logger.error({ err, jobId: String(job._id) }, 'Job crashed');
    const retriable = err instanceof AppError && err.code === 'AI_UNAVAILABLE' && job.attempts < MAX_ATTEMPTS;
    if (retriable) {
      // Exponential backoff: 30 s, 60 s, ...
      await Job.updateOne({ _id: job._id }, { status: 'queued', runAt: new Date(Date.now() + 2 ** job.attempts * 15_000), lastError: code });
    } else {
      await markFinalFailure(job, code);
    }
  }
}

// Polls the Mongo-backed queue. Claiming is atomic, so several API instances can safely run a worker.
export function startWorker(intervalMs = 3000) {
  let stopped = false;
  let busy = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      let job: JobDoc | null;
      while (!stopped && (job = await claimNext())) await processJob(job);
    } catch (err) {
      logger.error({ err }, 'Worker tick failed');
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  logger.info('Background worker started');
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
