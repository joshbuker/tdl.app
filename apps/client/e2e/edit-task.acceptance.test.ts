import { expect, test } from './fixtures.ts';

test.describe('Edit a task', () => {
  test('Navigate to a linked task', async ({ page, signUp }) => {
    await signUp(page, 'edit-navigate');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    const newTask = page.getByRole('textbox', { name: 'New task' });
    for (const title of ['A', 'B']) {
      await newTask.fill(title);
      await newTask.press('Enter');
      await expect(newTask).toHaveValue('');
      await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    }

    await page.getByRole('link', { name: 'A', exact: true }).click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]+$/);
    const aUrl = page.url();
    await page.goBack();

    await page.getByRole('link', { name: 'B', exact: true }).click();
    const title = page.getByRole('textbox', { name: 'Title' });
    await expect(title).toHaveValue('B');
    await page.getByRole('button', { name: 'Add prerequisite' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Task' }).fill('A');
    await page.getByRole('option', { name: 'A', exact: true }).click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toBeHidden();

    const prerequisites = page.getByRole('region', { name: 'Prerequisites' });
    await prerequisites.getByRole('link', { name: 'A', exact: true }).click();

    await expect(page).toHaveURL(aUrl);
    await expect(title).toHaveValue('A');
  });
});
