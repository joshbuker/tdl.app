import { expect, test } from './fixtures.ts';

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
