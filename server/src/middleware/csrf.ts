import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

// Defense in depth with SameSite cookies: state-changing requests must carry a custom header,
// which cross-site forms cannot set and which CORS blocks for untrusted origins.
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (SAFE.has(req.method) || req.get('x-requested-with') === 'prepai') return next();
  next(new AppError(403, 'FORBIDDEN', 'Missing required request header'));
};
