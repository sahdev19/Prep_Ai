import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

let storage: Storage | null = null;
export const setStorage = (s: Storage | null) => {
  storage = s;
};

export function getStorage(): Storage {
  if (storage) return storage;
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new AppError(503, 'INTERNAL_ERROR', 'File storage is not configured on this server.');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createS3Storage } = require('./s3') as typeof import('./s3');
  storage = createS3Storage({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  return storage;
}
