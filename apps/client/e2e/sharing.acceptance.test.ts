import {
  acceptInvitation,
  addTask,
  createList,
  defaultListUrl,
  expect,
  invite,
  test,
} from './fixtures.ts';

test.describe('Sharing', () => {
  test("Viewer can't edit", async ({ browser, page, signUp }) => {
    // Given "bob" is a viewer of "House"
    const bobContext = await browser.newContext();
    const bob = await bobContext.newPage();
    await signUp(bob, 'viewer-bob');
    await signUp(page, 'viewer-alice');
    await createList(page, 'House');
    await addTask(page, 'Paint fence');
    await invite(page, 'viewer-bob', 'Viewer');

    // The count is asked for when a page opens.
    await bob.reload();
    await expect(bob.getByRole('link', { name: 'Invitations' })).toContainText('1');
    await acceptInvitation(bob, 'viewer-alice');
    await expect(bob.getByRole('heading', { name: 'House' })).toBeVisible();
    await expect(bob.getByRole('link', { name: 'Paint fence', exact: true })).toBeVisible();

    // When he tries to complete a task in "House", then he can't: nothing offers it
    await expect(bob.getByRole('checkbox', { name: 'Complete Paint fence' })).toHaveCount(0);
    await expect(bob.getByRole('textbox', { name: 'New task' })).toHaveCount(0);
    await bob.getByRole('link', { name: 'Paint fence', exact: true }).click();
    await expect(bob.getByRole('textbox', { name: 'Title' })).toHaveValue('Paint fence');
    await expect(bob.getByRole('textbox', { name: 'Title' })).toHaveAttribute('readonly');
    await expect(bob.getByRole('textbox', { name: 'Notes' })).toHaveAttribute('readonly');
    await expect(bob.getByRole('checkbox', { name: 'Completed' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(bob.getByRole('button', { name: 'Add prerequisite' })).toHaveCount(0);

    // And alice still can
    await page.getByRole('checkbox', { name: 'Complete Paint fence' }).click();
    await expect(page.getByRole('checkbox', { name: 'Complete Paint fence' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await bobContext.close();
  });

  test('Remove a collaborator', async ({ browser, page, signUp }) => {
    // Given "bob" is an editor of "House"
    const bobContext = await browser.newContext();
    const bob = await bobContext.newPage();
    await signUp(bob, 'remove-bob');
    await signUp(page, 'remove-alice');
    await createList(page, 'House');
    await addTask(page, 'Paint fence');
    await invite(page, 'remove-bob', 'Editor');
    await acceptInvitation(bob, 'remove-alice');
    await bob.getByRole('link', { name: 'Paint fence', exact: true }).click();
    const taskUrl = bob.url();
    await expect(bob.getByRole('textbox', { name: 'Title' })).not.toHaveAttribute('readonly');

    // When "alice" removes him from "House"
    await page.getByRole('button', { name: 'Share' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share' });
    const people = dialog.getByRole('region', { name: 'People with access' });
    await expect(people).toContainText('Editor');
    await people.getByRole('button', { name: 'Remove the Editor' }).click();
    await expect(people).toContainText('Nobody else has access.');

    // Then he no longer sees "House" or its tasks
    await expect(bob.getByRole('alert')).toHaveText("This doesn't exist, or you can't see it.");
    await expect(bob.getByRole('link', { name: 'House' })).toHaveCount(0);
    await bob.goto('/');
    await expect(bob).toHaveURL(defaultListUrl);
    await expect(bob.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await expect(bob.getByRole('link', { name: 'Paint fence', exact: true })).toHaveCount(0);

    // And edits he makes to its tasks afterwards are refused: there is nothing left to edit
    await bob.goto(taskUrl);
    await expect(bob.getByRole('alert')).toHaveText("This doesn't exist, or you can't see it.");
    await expect(bob.getByRole('textbox', { name: 'Title' })).toHaveCount(0);
    await bobContext.close();
  });
});
