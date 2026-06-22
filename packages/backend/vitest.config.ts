import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: true,
    restoreMocks: true,
    include: ['src/**/*.spec.ts'],
  },
});
