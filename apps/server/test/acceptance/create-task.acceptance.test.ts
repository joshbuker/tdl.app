import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ok, settle, startServer, taskTitled, titles, type TestServer } from './harness.ts';

describe('Create a task', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Create a task with a title', async () => {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);

    // When the user creates a task titled "Buy milk"
    ok(await phone.createTask(alice.defaultListId, 'Buy milk'));
    await settle(phone);

    // Then "Buy milk" appears in their default list
    const laptop = await server.device(alice);
    expect(taskTitled(laptop, 'Buy milk').listId).toBe(alice.defaultListId);
  });

  test('Title is required', async () => {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);

    // When the user tries to create a task with a blank title
    const result = await phone.createTask(alice.defaultListId, '   ');

    // Then no task is created and the user is told a title is required
    expect(result).toEqual({ ok: false, errors: [{ field: 'title', code: 'required' }] });
    expect(phone.pending()).toEqual([]);
    await settle(phone);
    expect(titles(await server.device(alice))).toEqual([]);
  });

  test('Surrounding whitespace is stripped', async () => {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);

    // When the user creates a task titled "  Buy milk  "
    ok(await phone.createTask(alice.defaultListId, '  Buy milk  '));
    await settle(phone);

    // Then the task is titled "Buy milk"
    expect(titles(phone)).toEqual(['Buy milk']);
    expect(titles(await server.device(alice))).toEqual(['Buy milk']);
  });

  test('Duplicate titles are allowed', async () => {
    // Given a task "Call mom" exists
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    ok(await phone.createTask(alice.defaultListId, 'Call mom'));
    await settle(phone);

    // When the user creates another task titled "Call mom" without choosing the suggestion
    ok(await phone.createTask(alice.defaultListId, 'Call mom'));
    await settle(phone);

    // Then there are two tasks titled "Call mom"
    expect(titles(await server.device(alice))).toEqual(['Call mom', 'Call mom']);
  });
});
