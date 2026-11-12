import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    globalSetup: ['./test/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
