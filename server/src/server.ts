import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { startWorker } from './jobs/worker';
import { logger } from './utils/logger';

async function main() {
  await mongoose.connect(env.MONGO_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
  const server = createApp().listen(env.PORT, () =>
    logger.info(`PrepAI API listening on port ${env.PORT}`),
  );

  const stopWorker = env.WORKER_ENABLED ? startWorker() : () => undefined;

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    stopWorker();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
