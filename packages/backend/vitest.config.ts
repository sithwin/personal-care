import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    restoreMocks: true,
    include: ['src/**/*.spec.ts'],
  },
});
