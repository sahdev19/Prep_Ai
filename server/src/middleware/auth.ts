import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken, type Role } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== 'string') return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
  try {
    const { sub, role } = verifyAccessToken(token);
    req.user = { id: sub, role };
    next();
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again'));
  }
};

// Authorization is always enforced on the server, never trusted from the client.
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'));
    next();
  };
