import {
  acceptInvitation,
  addTask,
  createList,
  expect,
  invite,
  openNewTask,
  test,
} from './fixtures.ts';

test.describe('Offline use', () => {
  test('Rejected offline changes are kept', async ({ browser, page, signUp }) => {
    // Reconnecting backs off up to 30 s between attempts.
    test.setTimeout(90_000);
    const bobContext = await browser.newContext();
    const bob = await bobContext.newPage();
    await signUp(bob, 'rejected-bob');
    await signUp(page, 'rejected-alice');
    await createList(page, 'House');
    await addTask(page, 'Fix roof');
    await openNewTask(page, 'Paint fence');
    await page.goBack();
    await invite(page, 'rejected-bob', 'Editor');
    await acceptInvitation(bob, 'rejected-alice');
    const status = bob.getByRole('status', { name: 'Sync status' });

    // Given "bob" edited "Paint fence" offline (and the notes of "Fix roof")
    await bobContext.setOffline(true);
    await bob.getByRole('link', { name: 'Fix roof', exact: true }).click();
    await expect(bob.getByRole('textbox', { name: 'Title' })).toHaveValue('Fix roof');
    await bob.getByRole('textbox', { name: 'Notes' }).fill('Use slate');
    await bob.goBack();
    await bob.getByRole('link', { name: 'Paint fence', exact: true }).click();
    const title = bob.getByRole('textbox', { name: 'Title' });
    await title.fill('Paint the fence');
    await title.press('Enter');
    await expect(status).toContainText('2 changes waiting');

    // and meanwhile lost access to "House"
    await page.getByRole('button', { name: 'Share' }).click();
    const people = page
      .getByRole('dialog', { name: 'Share' })
      .getByRole('region', { name: 'People with access' });
    await people.getByRole('button', { name: 'Remove the Editor' }).click();
    await expect(people).toContainText('Nobody else has access.');

    // When his device syncs
    await bobContext.setOffline(false);
    const couldntSync = bob.getByRole('link', { name: "2 changes couldn't sync" });
    await expect(couldntSync).toBeVisible({ timeout: 40_000 });

    // Then his edit is shown under "couldn't sync", saying he no longer has access
    await couldntSync.click();
    await expect(bob).toHaveURL('/couldnt-sync');
    const rows = bob.getByRole('listitem');
    await expect(rows).toHaveCount(2);
    for (const name of ['Paint the fence', 'Fix roof']) {
      await expect(rows.filter({ hasText: name })).toContainText(
        "This doesn't exist, or you can't see it.",
      );
    }

    // And he can copy it into one of his own lists as a new task, or discard it
    await bob
      .getByRole('button', { name: 'Copy the change to Paint the fence into my tasks' })
      .click();
    await bob.getByRole('button', { name: 'Discard the change to Fix roof' }).click();
    await expect(bob.getByText('Nothing here: every change has synced.')).toBeVisible();
    await expect(status).not.toContainText("couldn't sync");

    await bob.goto('/');
    await expect(bob.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await expect(bob.getByRole('link', { name: 'Paint the fence', exact: true })).toBeVisible();
    await expect(bob.getByRole('link', { name: 'Fix roof', exact: true })).toHaveCount(0);
    await expect(status).toContainText('Synced');
    await expect(status).not.toContainText('waiting');

    // Alice's tasks are unchanged
    await expect(page.getByRole('link', { name: 'Paint fence', exact: true })).toBeVisible();
    await bobContext.close();
  });
});
