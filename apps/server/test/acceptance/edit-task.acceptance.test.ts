import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ok, settle, startServer, taskTitled, titles, type TestServer } from './harness.ts';

describe('Edit a task', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Rename a task', async () => {
    // Given a task "Buy milk"
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    const laptop = await server.device(alice);
    const buyMilk = ok(await phone.createTask(alice.defaultListId, 'Buy milk'));
    await settle(phone, laptop);

    // When the user changes its title to "Buy oat milk"
    ok(await phone.setTaskField(buyMilk, 'title', 'Buy oat milk'));
    await settle(phone, laptop);

    // Then the task is shown as "Buy oat milk" everywhere
    expect(titles(phone)).toEqual(['Buy oat milk']);
    expect(titles(laptop)).toEqual(['Buy oat milk']);
  });

  test('Edit notes', async () => {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    const paintFence = ok(await phone.createTask(alice.defaultListId, 'Paint fence'));

    // When the user types notes on a task and pauses
    ok(await phone.setTaskField(paintFence, 'notes', 'Two coats, **white**'));
    await settle(phone);

    // Then the notes are saved
    expect(taskTitled(await server.device(alice), 'Paint fence').notes).toBe('Two coats, **white**');
  });
});
