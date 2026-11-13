import { expect, logIn, openNewTask, PASSWORD, test } from './fixtures.ts';

test.describe('Login', () => {
  test('Not logged in', async ({ page }) => {
    await page.goto('/lists/anything');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
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
