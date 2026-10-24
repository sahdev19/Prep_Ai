import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found', requestId: String(req.id) },
  });
};

// Single error contract: { error: { code, message, requestId } }. Never leaks internals.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    return void res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body', requestId: String(req.id) } });
  }
  if ((err as { name?: string }).name === 'MulterError') {
    const tooBig = (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
    const message = tooBig ? 'File is too large. The maximum size is 5 MB.' : 'Upload a single file in the "file" field.';
    return void res.status(400).json({ error: { code: 'FILE_INVALID', message, requestId: String(req.id) } });
  }
  const known = err instanceof AppError;
  const status = known ? err.status : 500;
  if (!known) logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(status).json({
    error: {
      code: known ? err.code : 'INTERNAL_ERROR',
      message: known ? err.message : 'Something went wrong. Please try again.',
      requestId: String(req.id),
    },
  });
};
