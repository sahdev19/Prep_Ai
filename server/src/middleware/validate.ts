import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

// Validates and replaces the request part with the parsed (stripped, coerced) value.
export const validate =
  (schema: ZodSchema, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.') || source}: ${i.message}`).join('; ');
      return next(new AppError(400, 'VALIDATION_ERROR', msg));
    }
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
