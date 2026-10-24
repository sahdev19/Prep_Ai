import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Storage } from './index';

interface S3Config {
  bucket: string; region: string; endpoint?: string;
  accessKeyId: string; secretAccessKey: string; forcePathStyle: boolean;
}

// Works with AWS S3, Cloudflare R2, MinIO and other S3-compatible services. The bucket must be private.
export function createS3Storage(c: S3Config): Storage {
  const s3 = new S3Client({
    region: c.region,
    endpoint: c.endpoint,
    forcePathStyle: c.forcePathStyle,
    maxAttempts: 3,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return {
    async put(key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      const r = await s3.send(new GetObjectCommand({ Bucket: c.bucket, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    },
    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
    },
  };
}
