import { test as base, expect, type Page } from '@playwright/test';
import { createDb, expireSessions, type Db } from '@tdl/server/testing';

export { expect };

/** Where the home page `/` takes a logged-in user: their default list. */
export const defaultListUrl = /\/lists\/[0-9a-f-]+$/;

function fromSetup(name: string): string {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} is not set: is e2e/global-setup.ts running?`);
  return value;
}

interface Fixtures {
  /** Signs up `username` through the sign-up page, ending logged in on their default list. */
  signUp: (page: Page, username: string) => Promise<void>;
  /** Moves the expiry of every session of `username` into the past. */
  expireSession: (username: string) => Promise<void>;
}

export const test = base.extend<Fixtures, { db: Db }>({
  baseURL: async ({}, use) => {
    await use(fromSetup('TDL_E2E_BASE_URL'));
  },
  db: [
    async ({}, use) => {
      const handle = createDb(fromSetup('TDL_E2E_DATABASE_URL'));
      await use(handle.db);
      await handle.close();
    },
    { scope: 'worker' },
  ],
  signUp: async ({}, use) => {
    await use(async (page, username) => {
      await page.goto('/signup');
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Email').fill(`${username}@example.com`);
      await page.getByLabel('Password').fill('correct horse battery staple');
      await page.getByLabel('Given name').fill(username);
      await page.getByLabel('Family name').fill('Tester');
      await page.getByRole('checkbox', { name: 'I accept the terms of service' }).click();
      await page.getByRole('button', { name: 'Sign up' }).click();
      await expect(page).toHaveURL(defaultListUrl);
    });
  },
  expireSession: async ({ db }, use) => {
    await use((username) => expireSessions(db, username));
  },
});
