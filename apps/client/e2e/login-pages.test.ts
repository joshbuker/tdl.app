import { defaultListUrl, expect, openNewTask, test } from './fixtures.ts';

// The login and sign-up pages, beyond the spec's scenarios.

test('signing up ends logged in on the default list', async ({ page, signUp }) => {
  await signUp(page, 'pages-signup');
  await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeHidden();
});

test('logging in ends on the default list', async ({ page, browser, signUp }) => {
  await signUp(page, 'pages-login');
  const fresh = await browser.newPage();
  await fresh.goto('/login');
  await fresh.getByLabel('Username or email').fill('pages-login');
  await fresh.getByLabel('Password').fill('correct horse battery staple');
  await fresh.getByRole('button', { name: 'Log in' }).click();
  await expect(fresh).toHaveURL(defaultListUrl);
  await fresh.close();
});

test('a wrong password shows why', async ({ page, signUp, browser }) => {
  await signUp(page, 'pages-wrong');
  const fresh = await browser.newPage();
  await fresh.goto('/login');
  await fresh.getByLabel('Username or email').fill('pages-wrong');
  await fresh.getByLabel('Password').fill('not the password');
  await fresh.getByRole('button', { name: 'Log in' }).click();
  await expect(fresh.getByRole('alert')).toHaveText('Wrong username or password.');
  await expect(fresh).toHaveURL('/login');
  await fresh.close();
});

test('sign-up shows field errors on their fields', async ({ page, signUp, browser }) => {
  await signUp(page, 'pages-taken');
  const fresh = await browser.newPage();
  await fresh.goto('/signup');
  await fresh.getByLabel('Username').fill('pages-taken');
  await fresh.getByLabel('Email').fill('someone-else@example.com');
  await fresh.getByLabel('Password').fill('correct horse battery staple');
  await fresh.getByLabel('Given name').fill('Someone');
  await fresh.getByLabel('Family name').fill('Else');
  await fresh.getByRole('button', { name: 'Sign up' }).click();
  await expect(fresh.getByText('This is already taken.')).toBeVisible();
  await expect(fresh.getByText('This is required.')).toBeVisible();
  await expect(fresh).toHaveURL('/signup');
  await fresh.close();
});

test('an expired session no longer works', async ({ page, signUp, expireSession }) => {
  await signUp(page, 'pages-expired');
  expect((await page.request.get('/api/me')).status()).toBe(200);
  await expireSession('pages-expired');
  expect((await page.request.get('/api/me')).status()).toBe(401);
});

test('logging out from the menu ends on the login page', async ({ page, signUp }) => {
  await signUp(page, 'pages-log-out');
  await page.getByRole('button', { name: 'pages-log-out' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('logging out with unsynced changes warns first', async ({ page, signUp, expireSession }) => {
  await signUp(page, 'pages-log-out-unsynced');
  await openNewTask(page, 'Paint fence');
  await expireSession('pages-log-out-unsynced');
  const title = page.getByRole('textbox', { name: 'Title' });
  await title.fill('Paint the fence');
  await title.press('Enter');

  const session = page.getByRole('dialog', { name: 'Log in again' });
  await session.getByRole('button', { name: 'Log out' }).click();
  const warning = page.getByRole('dialog', { name: 'Unsynced changes' });
  await expect(warning).toContainText("1 change hasn't synced yet.");
  await expect(session).toBeHidden();

  // Logging in again closes the warning, and the log-in dialog comes back.
  await warning.getByRole('button', { name: 'Log in again' }).click();
  await expect(warning).toBeHidden();
  await expect(session).toBeVisible();

  await session.getByRole('button', { name: 'Log out' }).click();
  await warning.getByRole('button', { name: 'Discard and log out' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
