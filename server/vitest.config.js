import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 180000,
    testTimeout: 40000,
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-value-123456',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ems-test',
      CLIENT_URL: 'http://localhost:5173',
      APP_TIMEZONE: 'UTC',
      BCRYPT_ROUNDS: '4',
      JWT_EXPIRES_IN: '1h',
    },
  },
});
