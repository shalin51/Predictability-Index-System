import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/database/verify-db.ts'],
    },
  },
  resolve: {
    alias: {
      '@amfpi/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
