import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

const base: CookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' };

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/api/v1/auth'; // refresh cookie is only sent to auth endpoints

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, path: '/', maxAge: env.ACCESS_TOKEN_TTL_MIN * 60_000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, path: REFRESH_PATH, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}
