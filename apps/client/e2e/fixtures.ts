import { test as base, expect, type Page } from '@playwright/test';
import { contentChangesOf, createDb, expireSessions, type Db } from '@tdl/server/testing';

export { expect };

/** Where the home page `/` takes a logged-in user: their default list. */
export const defaultListUrl = /\/lists\/[0-9a-f-]+$/;

/** The password `signUp` gives every user. */
export const PASSWORD = 'correct horse battery staple';

/** Logs `username` in through the login page, ending on their default list. */
export async function logIn(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username or email' }).fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(defaultListUrl);
}

/** Adds a task to the list on the page, and opens it. Returns the task's ID. */
export async function openNewTask(page: Page, title: string): Promise<string> {
  const newTask = page.getByRole('textbox', { name: 'New task' });
  await newTask.fill(title);
  await newTask.press('Enter');
  await expect(newTask).toHaveValue('');
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(title);
  return page.url().split('/').at(-1) ?? '';
}

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
  /** The content changes (`{ field, value }`) the server holds for a record, oldest first. */
  contentChanges: (recordId: string) => Promise<unknown[]>;
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
      await page.getByLabel('Password').fill(PASSWORD);
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
  contentChanges: async ({ db }, use) => {
    await use((recordId) => contentChangesOf(db, recordId));
  },
});
