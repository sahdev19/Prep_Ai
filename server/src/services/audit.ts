import { AuditLog } from '../models';
import { logger } from '../utils/logger';

interface AuditOpts {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  requestId?: string;
}

// Audit failures must never break the user's request. Never pass secrets or content here.
export async function audit(action: string, opts: AuditOpts = {}) {
  try {
    await AuditLog.create({ action, ...opts });
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
  }
}
