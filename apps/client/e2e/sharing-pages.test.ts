import {
  acceptInvitation,
  addTask,
  createList,
  defaultListUrl,
  expect,
  invite,
  test,
} from './fixtures.ts';

// The sharing dialog and invitations page beyond the scenarios (see sharing.acceptance.test.ts).
test.describe('sharing pages', () => {
  test('leaving a shared list removes it, and the owner sees nobody left', async ({
    browser,
    page,
    signUp,
  }) => {
    const bobContext = await browser.newContext();
    const bob = await bobContext.newPage();
    await signUp(bob, 'leave-bob');
    await signUp(page, 'leave-alice');
    await createList(page, 'House');
    await addTask(page, 'Paint fence');
    await invite(page, 'leave-bob', 'Editor');
    await acceptInvitation(bob, 'leave-alice');

    await bob.getByRole('button', { name: 'Share' }).click();
    await bob.getByRole('dialog', { name: 'Share' }).getByRole('button', { name: 'Leave' }).click();

    await expect(bob).toHaveURL(defaultListUrl);
    await expect(bob.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await expect(bob.getByRole('link', { name: 'House' })).toHaveCount(0);
    await expect(bob.getByRole('link', { name: 'Paint fence', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Share' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Share' })
        .getByRole('region', { name: 'People with access' }),
    ).toContainText('Nobody else has access.');
    await bobContext.close();
  });
});
