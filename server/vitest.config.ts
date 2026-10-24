import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://localhost:27017/prepai-test',
      CORS_ORIGIN: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-123',
      LOG_LEVEL: 'silent',
    },
  },
});
