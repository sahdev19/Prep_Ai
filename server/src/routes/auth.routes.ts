import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { login, logout, refresh, register, type Ctx } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../utils/cookies';
import { loginBody, registerBody } from '../validation/auth';

export const ctxOf = (req: Request): Ctx => ({ ip: req.ip, requestId: String(req.id), userAgent: req.get('user-agent') });

const limiter = (windowMin: number, limit: number) =>
  rateLimit({
    windowMs: windowMin * 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please try again later.')),
  });

export const authRouter = Router();

authRouter.post('/register', limiter(60, 5), validate(registerBody), asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await register(req.body, ctxOf(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user });
}));

authRouter.post('/login', limiter(15, 10), validate(loginBody), asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await login(req.body, ctxOf(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (typeof raw !== 'string') throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');
  try {
    const { accessToken, refreshToken } = await refresh(raw, ctxOf(req));
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ ok: true });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  await logout(typeof raw === 'string' ? raw : undefined, ctxOf(req));
  clearAuthCookies(res);
  res.status(204).end();
}));
