import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import { AppError } from './utils/AppError';
import { v1 } from './routes';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.')),
    }),
  );

  // Liveness: process is up. Readiness: dependencies are reachable.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/ready', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ready' : 'degraded', db: dbUp });
  });

  app.use('/api/v1', v1);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
