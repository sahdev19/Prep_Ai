import 'dotenv/config';
import { z } from 'zod';

// Empty strings (e.g. from docker-compose interpolation) count as "not set".
const opt = <T extends z.ZodTypeAny>(t: T) => z.preprocess((v) => (v === '' ? undefined : v), t.optional());
const bool = (d: 'true' | 'false') => z.enum(['true', 'false']).default(d).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  CORS_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  ANTHROPIC_API_KEY: opt(z.string().min(1)),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5-5'),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).default(20),
  S3_BUCKET: opt(z.string().min(1)),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: opt(z.string().url()),
  S3_ACCESS_KEY_ID: opt(z.string().min(1)),
  S3_SECRET_ACCESS_KEY: opt(z.string().min(1)),
  S3_FORCE_PATH_STYLE: bool('false'),
  WORKER_ENABLED: bool('true'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

// Fails fast at startup if configuration is missing or invalid.
export const env = schema.parse(process.env);
