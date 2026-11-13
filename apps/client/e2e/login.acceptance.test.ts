import { expect, test } from './fixtures.ts';

test.describe('Login', () => {
  test('Not logged in', async ({ page }) => {
    await page.goto('/lists/anything');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });
});
