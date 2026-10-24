import pino from 'pino';
import { env } from '../config/env';

// Redact anything that could carry credentials or tokens.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.token',
    '*.apiKey',
  ],
});
