import { defaultListUrl, expect, logIn, openNewTask, PASSWORD, test } from './fixtures.ts';

test.describe('Login', () => {
  test('Not logged in', async ({ page }) => {
    await page.goto('/lists/anything');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('Already logged in', async ({ page, signUp }) => {
    // Given "alice" is logged in
    await signUp(page, 'already-logged-in');
    const tasks = page.url();

    // When she opens the login page or the sign-up page, then she is taken to her tasks
    await page.goto('/login');
    await expect(page).toHaveURL(tasks);
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await page.goto('/signup');
    await expect(page).toHaveURL(tasks);
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  });

  test('Revoke a lost device', async ({ browser, page, signUp }) => {
    // Given "alice" is logged in on her phone and laptop
    await signUp(page, 'revoke-lost');
    const phoneContext = await browser.newContext();
    const phone = await phoneContext.newPage();
    await logIn(phone, 'revoke-lost');
    await openNewTask(phone, 'Paint fence');

    // When she revokes her phone from her laptop's settings
    await page.getByRole('button', { name: 'revoke-lost' }).click();
    await page.getByRole('menuitem', { name: 'Devices' }).click();
    await expect(page).toHaveURL('/settings/devices');
    await expect(page.getByText('This device')).toBeVisible();
    const revoke = page.getByRole('button', { name: /^Revoke / });
    await expect(revoke).toHaveCount(1);
    await revoke.click();
    await expect(revoke).toHaveCount(0);

    // Then her phone is logged out and stops syncing
    await expect(phone).toHaveURL('/login');

    // And it deleted its local data: with the server out of reach, it no longer opens offline
    await phone.route('**/api/**', (route) => route.abort());
    await phone.goto('/');
    await expect(phone).toHaveURL('/login');
    await expect(phone).not.toHaveURL(defaultListUrl);
    await phoneContext.close();
  });

  test('Session expires in place', async ({ browser, page, signUp, expireSession }) => {
    await signUp(page, 'expires-in-place');
    await openNewTask(page, 'Paint fence');
    const taskUrl = page.url();

    await expireSession('expires-in-place');
    const notes = page.getByRole('textbox', { name: 'Notes' });
    await notes.fill('Use oil paint');
    // The save is pushed once typing pauses, and the server refuses the expired session.
    const status = page.getByRole('status', { name: 'Sync status' });
    await expect(status).toContainText('1 change waiting');

    const dialog = page.getByRole('dialog', { name: 'Log in again' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Username or email' }).fill('expires-in-place');
    await dialog.getByLabel('Password').fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Log in' }).click();

    await expect(dialog).toBeHidden();
    await expect(status).toContainText('Synced');
    await expect(status).not.toContainText('waiting');
    await expect(page).toHaveURL(taskUrl);
    await expect(notes).toHaveValue('Use oil paint');

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await logIn(otherPage, 'expires-in-place');
    await otherPage.goto(taskUrl);
    await expect(otherPage.getByRole('textbox', { name: 'Notes' })).toHaveValue('Use oil paint');
    await other.close();
  });
});
