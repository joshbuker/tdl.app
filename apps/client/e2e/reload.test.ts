import { expect, openNewTask, PASSWORD, test } from './fixtures.ts';

// Reloading keeps unsynced changes: the new page reopens the device's database (once the old
// page's worker has let go of it) and syncs them once, after logging in again.
test('a change made after the session expired survives a reload, and syncs once', async ({
  page,
  signUp,
  expireSession,
  contentChanges,
}) => {
  await signUp(page, 'reload-expired');
  const taskId = await openNewTask(page, 'Paint fence');

  await expireSession('reload-expired');
  const title = page.getByRole('textbox', { name: 'Title' });
  await title.fill('Paint the fence');
  await title.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Log in again' });
  await expect(dialog).toBeVisible();

  await page.reload();
  await expect(title).toHaveValue('Paint the fence');
  const status = page.getByRole('status', { name: 'Sync status' });
  await expect(status).toContainText('1 change waiting');

  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Username or email' }).fill('reload-expired');
  await dialog.getByLabel('Password').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Log in' }).click();
  await expect(status).toContainText('Synced');
  await expect(status).not.toContainText('waiting');

  const renames = (await contentChanges(taskId)).filter(
    (change) => (change as { field: string }).field === 'title',
  );
  expect(
    renames.filter((change) => (change as { value: unknown }).value === 'Paint the fence'),
  ).toHaveLength(1);
});
