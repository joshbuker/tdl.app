import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { nextUp, ok, settle, startServer, taskTitled, type TestServer } from './harness.ts';

describe('Complete a task', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Complete a task', async () => {
    // Given an incomplete task "Buy milk"
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    const laptop = await server.device(alice);
    const buyMilk = ok(await phone.createTask(alice.defaultListId, 'Buy milk'));
    await settle(phone, laptop);
    expect(nextUp(laptop)).toEqual(['Buy milk']);

    // When the user completes it
    ok(await phone.setTaskField(buyMilk, 'completedAt', new Date().toISOString()));
    await settle(phone, laptop);

    // Then "Buy milk" is no longer shown as next up
    expect(nextUp(phone)).toEqual([]);
    expect(nextUp(laptop)).toEqual([]);
  });

  test('Mark a task incomplete again', async () => {
    // Given "Paint fence" is completed
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    const laptop = await server.device(alice);
    const paintFence = ok(await phone.createTask(alice.defaultListId, 'Paint fence'));
    ok(await phone.setTaskField(paintFence, 'completedAt', new Date().toISOString()));
    await settle(phone, laptop);
    expect(nextUp(laptop)).toEqual([]);

    // When the user marks it incomplete
    ok(await phone.setTaskField(paintFence, 'completedAt', null));
    await settle(phone, laptop);

    // Then "Paint fence" is incomplete and next up again
    expect(taskTitled(laptop, 'Paint fence').completedAt).toBeNull();
    expect(nextUp(laptop)).toEqual(['Paint fence']);
  });
});
