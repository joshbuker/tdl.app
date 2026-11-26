import { expect, openNewTask, test } from './fixtures.ts';

// The list and task pages, beyond the spec's scenarios.

test('a refused link shows why, and next up follows the links', async ({ page, signUp }) => {
  await signUp(page, 'pages-links');
  const newTask = page.getByRole('textbox', { name: 'New task' });
  for (const title of ['A', 'B']) {
    await newTask.fill(title);
    await newTask.press('Enter');
    await expect(newTask).toHaveValue('');
  }
  const list = page.getByRole('main');
  await expect(list.getByRole('status')).toHaveCount(2);

  const addPrerequisite = async (title: string): Promise<void> => {
    await page.getByRole('button', { name: 'Add prerequisite' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Task' }).fill(title);
    await page.getByRole('option', { name: title, exact: true }).click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  };

  await page.getByRole('link', { name: 'B', exact: true }).click();
  await addPrerequisite('A');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page
    .getByRole('region', { name: 'Prerequisites' })
    .getByRole('link', { name: 'A' })
    .click();
  await addPrerequisite('B');
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'That link would make a loop.',
  );

  await page.goBack();
  await page.goBack();
  const rowOf = (title: string) =>
    list
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: title, exact: true }) });
  await expect(rowOf('A').getByRole('status')).toHaveText('Next up');
  await expect(rowOf('B').getByRole('status')).toHaveCount(0);
});

test('edits made just before leaving the task are saved', async ({ page, signUp }) => {
  await signUp(page, 'pages-notes');
  const newTask = page.getByRole('textbox', { name: 'New task' });
  for (const title of ['A', 'B']) {
    await newTask.fill(title);
    await newTask.press('Enter');
    await expect(newTask).toHaveValue('');
  }
  await page.getByRole('link', { name: 'B', exact: true }).click();
  await page.getByRole('button', { name: 'Add prerequisite' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Task' }).fill('A');
  await page.getByRole('option', { name: 'A', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();

  const notes = page.getByRole('textbox', { name: 'Notes' });
  const title = page.getByRole('textbox', { name: 'Title' });
  // Switching to another task, well within the pause that saves notes.
  await notes.pressSequentially('Notes of B');
  await page
    .getByRole('region', { name: 'Prerequisites' })
    .getByRole('link', { name: 'A' })
    .click();
  await expect(title).toHaveValue('A');
  await expect(notes).toHaveValue('');

  // Leaving the task page.
  await notes.pressSequentially('Notes of A');
  await page.goBack();
  await expect(title).toHaveValue('B');
  await expect(notes).toHaveValue('Notes of B');
  await page.goBack();
  await page.getByRole('link', { name: 'A', exact: true }).click();
  await expect(notes).toHaveValue('Notes of A');

  // A title edited and left without leaving the field.
  await title.fill('A renamed');
  await page.goBack();
  await expect(page.getByRole('link', { name: 'A renamed', exact: true })).toBeVisible();
});

test('pages not opened since the app loaded open offline', async ({ context, page, signUp }) => {
  await signUp(page, 'pages-offline');
  await page.getByRole('textbox', { name: 'New task' }).fill('Paint fence');
  await page.getByRole('textbox', { name: 'New task' }).press('Enter');

  await context.setOffline(true);
  await page.getByRole('link', { name: 'Paint fence', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Paint fence');
  await page.getByRole('button', { name: 'pages-offline' }).click();
  await page.getByRole('menuitem', { name: 'Devices' }).click();
  await expect(page.getByRole('heading', { name: 'Devices' })).toBeVisible();
});

test('a title and notes typed just before a reload are kept', async ({ page, signUp }) => {
  await signUp(page, 'pages-reload');
  await openNewTask(page, 'Paint fence');
  const title = page.getByRole('textbox', { name: 'Title' });
  const notes = page.getByRole('textbox', { name: 'Notes' });

  // Neither field is left, and the reload comes well within the pause that saves them.
  await notes.fill('Use oil paint');
  await title.fill('Paint the fence');
  await page.reload();

  await expect(title).toHaveValue('Paint the fence');
  await expect(notes).toHaveValue('Use oil paint');
});
