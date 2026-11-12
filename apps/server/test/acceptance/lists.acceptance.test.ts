import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ok, settle, startServer, type TestServer } from './harness.ts';

describe('Lists', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Create a list', async () => {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);

    // When the user creates a list "Groceries"
    const groceries = ok(await phone.createList('Groceries'));
    await settle(phone);

    // Then "Groceries" appears among their lists
    const laptop = await server.device(alice);
    const lists = [...laptop.state().lists.values()];
    expect(lists.map((l) => l.title).sort()).toEqual(['Groceries', 'Inbox']);
    expect(laptop.state().lists.get(groceries)).toMatchObject({ title: 'Groceries', ownerId: alice.userId });
  });
});
