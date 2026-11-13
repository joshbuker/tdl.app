import { expect, test } from './fixtures.ts';

test.describe('Platforms', () => {
  test('Open in a second tab', async ({ context, page, signUp }) => {
    await signUp(page, 'second-tab');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

    const second = await context.newPage();
    await second.goto('/');
    await expect(second.getByText('TDL App is open in another tab.')).toBeVisible();
    await expect(second.getByRole('heading', { name: 'Inbox' })).toBeHidden();

    await page.close();
    await expect(second.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  });

  test("Storage can't be opened", async ({ page }) => {
    // The browser refuses the origin private file system, as some do in private windows: the
    // database worker is served with OPFS's entry point made to fail before anything runs.
    const blocked = '**/assets/db.worker-*.js';
    await page.route(blocked, async (route) => {
      const response = await route.fetch();
      const refuse = `navigator.storage.getDirectory = () => Promise.reject(new DOMException('Storage is blocked.', 'SecurityError'));\n`;
      await route.fulfill({ response, body: refuse + (await response.text()) });
    });

    await page.goto('/');

    const alert = page.getByRole('alert');
    await expect(alert.getByRole('heading', { name: "TDL App couldn't start" })).toBeVisible();
    await expect(alert).toContainText('Reason: ');
    await expect(alert).toContainText('Storage is blocked.');
    const reload = alert.getByRole('button', { name: 'Reload' });
    await expect(reload).toBeVisible();

    // Once storage works again, reloading starts the app.
    await page.unroute(blocked);
    await reload.click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });
});
