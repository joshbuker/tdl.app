import type { Id } from '@tdl/domain';
import type { Replica } from '@tdl/sync';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { nextUp, ok, settle, startServer, type TestServer } from './harness.ts';

const now = () => new Date().toISOString();

describe('Next up', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  /** Two devices of a new user, with "A" before "B" made on the phone and synced to both. */
  async function aBeforeB(): Promise<{ phone: Replica; laptop: Replica; a: Id; b: Id }> {
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    const laptop = await server.device(alice);
    const a = ok(await phone.createTask(alice.defaultListId, 'A'));
    const b = ok(await phone.createTask(alice.defaultListId, 'B'));
    expect((await phone.addLink(a, b)).ok).toBe(true);
    await settle(phone, laptop);
    return { phone, laptop, a, b };
  }

  test('Unblocked task is next up', async () => {
    // Given an incomplete task with no prerequisites
    const alice = await server.signUp('alice');
    const phone = await server.device(alice);
    ok(await phone.createTask(alice.defaultListId, 'Buy milk'));
    await settle(phone);

    // Then it is next up
    expect(nextUp(await server.device(alice))).toEqual(['Buy milk']);
  });

  test('Blocked task is not next up', async () => {
    // Given "A" is a prerequisite of "B", both incomplete
    const { laptop } = await aBeforeB();

    // Then "A" is next up and "B" is not
    expect(nextUp(laptop)).toEqual(['A']);
  });

  test('Completing a prerequisite unblocks', async () => {
    // Given "A" is a prerequisite of "B", both incomplete
    const { phone, laptop, a } = await aBeforeB();

    // When the user completes "A"
    ok(await phone.setTaskField(a, 'completedAt', now()));
    await settle(phone, laptop);

    // Then "B" is next up
    expect(nextUp(laptop)).toEqual(['B']);
  });

  test('Marking a prerequisite incomplete blocks again', async () => {
    // Given "A" is a completed prerequisite of "B", and "B" is next up
    const { phone, laptop, a } = await aBeforeB();
    ok(await phone.setTaskField(a, 'completedAt', now()));
    await settle(phone, laptop);
    expect(nextUp(laptop)).toEqual(['B']);

    // When the user marks "A" incomplete
    ok(await laptop.setTaskField(a, 'completedAt', null));
    await settle(phone, laptop);

    // Then "B" is not next up
    expect(nextUp(phone)).toEqual(['A']);
  });
});
