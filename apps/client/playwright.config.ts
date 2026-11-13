import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Acceptance tests are the `*.acceptance.test.ts` files; check:scenarios reads their results
// from the JSON report. `pnpm test:e2e` builds the app first.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.test.ts',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: process.env.CI !== undefined,
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: fileURLToPath(new URL('../../reports/playwright.json', import.meta.url)) },
    ],
  ],
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
