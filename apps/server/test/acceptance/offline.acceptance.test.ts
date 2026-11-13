import { buildGraph, findLoops, type Id } from '@tdl/domain';
import type { Replica } from '@tdl/sync';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Network, ok, settle, startServer, taskTitled, titles, type TestServer } from './harness.ts';

const graphOf = (replica: Replica) => buildGraph(replica.state().tasks.values(), replica.state().links.values());

describe('Offline use', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Create offline', async () => {
    // Given the device is offline
    const alice = await server.signUp('alice');
    const network = new Network();
    const phone = await server.device(alice, { network });
    network.online = false;

    // When the user creates "Buy milk"
    ok(await phone.createTask(alice.defaultListId, 'Buy milk'));

    // Then "Buy milk" appears immediately
    expect(titles(phone)).toEqual(['Buy milk']);
    await phone.sync();
    expect(phone.status()).toBe('offline');
    expect(titles(phone)).toEqual(['Buy milk']);

    // And it reaches the server when the device is back online
    network.online = true;
    await settle(phone);
    expect(titles(await server.device(alice))).toEqual(['Buy milk']);
  });

  test('Link offline', async () => {
    const alice = await server.signUp('alice');
    const network = new Network();
    const phone = await server.device(alice, { network });
    const paintFence = ok(await phone.createTask(alice.defaultListId, 'Paint fence'));
    await settle(phone);

    // Given the device is offline
    network.online = false;

    // When the user creates "Buy paint" and makes it a prerequisite of "Paint fence"
    const buyPaint = ok(await phone.createTask(alice.defaultListId, 'Buy paint'));
    const link = await phone.addLink(buyPaint, paintFence);

    // Then the link is shown immediately and synced later
    if (!link.ok) expect.fail(JSON.stringify(link.rejection));
    expect(phone.state().links.get(link.id)).toMatchObject({ prerequisiteId: buyPaint, postrequisiteId: paintFence });
    await phone.sync();
    expect(phone.status()).toBe('offline');
    network.online = true;
    await settle(phone);
    expect((await server.device(alice)).state().links.get(link.id)).toMatchObject({ prerequisiteId: buyPaint, postrequisiteId: paintFence });
  });

  test('Conflicting edits keep the most recent', async () => {
    const alice = await server.signUp('alice');
    let time = Date.now();
    const clock = () => time;
    const phoneNetwork = new Network();
    const laptopNetwork = new Network();
    const phone = await server.device(alice, { network: phoneNetwork, now: clock });
    const laptop = await server.device(alice, { network: laptopNetwork, now: clock });
    const paintFence = ok(await phone.createTask(alice.defaultListId, 'Paint fence'));
    await settle(phone, laptop);

    // Given one offline device renames "Paint fence" to "Paint the fence", and later another renames it to "Stain fence"
    phoneNetwork.online = false;
    laptopNetwork.online = false;
    time += 1000;
    ok(await phone.setTaskField(paintFence, 'title', 'Paint the fence'));
    time += 1000;
    ok(await laptop.setTaskField(paintFence, 'title', 'Stain fence'));

    // When both devices sync
    phoneNetwork.online = true;
    laptopNetwork.online = true;
    await settle(laptop, phone);

    // Then the task is called "Stain fence"
    // And its history shows both renames
    for (const replica of [phone, laptop]) {
      expect(taskTitled(replica, 'Stain fence').id).toBe(paintFence);
      const renames = replica.history(paintFence).flatMap((entry) => ('field' in entry.change && entry.change.field === 'title' ? [entry.change.value] : []));
      expect(renames).toEqual(['Paint fence', 'Paint the fence', 'Stain fence']);
    }
  });

  test('Links that together form a cycle', async () => {
    const alice = await server.signUp('alice');
    const phoneNetwork = new Network();
    const laptopNetwork = new Network();
    const phone = await server.device(alice, { network: phoneNetwork });
    const laptop = await server.device(alice, { network: laptopNetwork });

    // Given "A" and "B" are unlinked, and two devices are offline
    const a = ok(await phone.createTask(alice.defaultListId, 'A'));
    const b = ok(await phone.createTask(alice.defaultListId, 'B'));
    await settle(phone, laptop);
    phoneNetwork.online = false;
    laptopNetwork.online = false;

    // When the phone makes "A" a prerequisite of "B", the laptop makes "B" a prerequisite of "A"
    const aBeforeB = await phone.addLink(a, b);
    const bBeforeA = await laptop.addLink(b, a);
    if (!aBeforeB.ok || !bBeforeA.ok) expect.fail('a link was refused offline');

    // And both devices sync
    phoneNetwork.online = true;
    laptopNetwork.online = true;
    await settle(phone, laptop);

    // Then both links are kept
    // And the user sees the loop between "A" and "B" flagged
    for (const replica of [phone, laptop]) {
      expect([...replica.state().links.keys()].sort()).toEqual([aBeforeB.id, bBeforeA.id].sort());
      expect(findLoops(graphOf(replica))).toEqual([{ taskIds: [a, b].sort(), linkIds: [aBeforeB.id, bBeforeA.id].sort() }]);
    }
  });

  test('Live updates', async () => {
    // Given "alice" and "bob" both have "House" open and are online
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const house = ok(await alicePhone.createList('House'));
    const paintFence = ok(await alicePhone.createTask(house, 'Paint fence'));
    await settle(alicePhone);
    await server.share(alice, { kind: 'list', id: house }, bob, 'editor');
    const bobPhone = await server.device(bob);
    await settle(alicePhone, bobPhone);
    const stop = alicePhone.startLive();

    try {
      // When "bob" completes "Paint fence"
      const completedAt = new Date().toISOString();
      ok(await bobPhone.setTaskField(paintFence, 'completedAt', completedAt));
      await bobPhone.sync();

      // Then "alice" sees it completed within a few seconds, without refreshing
      await vi.waitFor(
        () => {
          expect(alicePhone.state().tasks.get(paintFence)?.completedAt).toBe(completedAt);
        },
        { timeout: 2000, interval: 20 },
      );
    } finally {
      stop();
    }
  });

  test('Rejected offline changes are kept', async () => {
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const house = ok(await alicePhone.createList('House'));
    const paintFence = ok(await alicePhone.createTask(house, 'Paint fence'));
    await settle(alicePhone);
    await server.share(alice, { kind: 'list', id: house }, bob, 'editor');
    const bobNetwork = new Network();
    const bobPhone = await server.device(bob, { network: bobNetwork });
    await settle(alicePhone, bobPhone);

    // Given "bob" edited "Paint fence" offline, and meanwhile lost access to "House"
    bobNetwork.online = false;
    ok(await bobPhone.setTaskField(paintFence, 'title', 'Paint the fence'));
    const [grant] = [...alicePhone.state().grants.values()].filter((g) => g.userId === bob.userId);
    expect((await server.request('DELETE', `/api/grants/${grant?.id ?? ''}`, { token: alice.token })).status).toBe(204);

    // When his device syncs
    bobNetwork.online = true;
    await settle(bobPhone);

    // Then his edit is shown under "couldn't sync", saying he no longer has access
    const rejected = bobPhone.rejected();
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      code: 'not-found',
      op: { record: { type: 'task', id: paintFence }, content: { field: 'title', value: 'Paint the fence' } },
    });
    expect(bobPhone.state().tasks.has(paintFence)).toBe(false);

    // And he can copy it into one of his own lists as a new task, or discard it
    const title = rejected[0]?.op.content?.value;
    const copy: Id = ok(await bobPhone.createTask(bob.defaultListId, typeof title === 'string' ? title : ''));
    await bobPhone.discardRejected(rejected[0]?.op.id ?? '');
    await settle(bobPhone);
    expect(bobPhone.rejected()).toEqual([]);
    expect(taskTitled(bobPhone, 'Paint the fence').id).toBe(copy);
  });

  test('Refused sync shows why', async () => {
    const outdated = await startServer({ protocolVersion: '2.0' });
    try {
      // Given the server refuses "alice"'s sync, e.g. because her app needs updating
      const alice = await outdated.signUp('alice');
      const phone = await outdated.device(alice, { protocolVersion: '1.0' });
      // It has never synced, so it makes its own list.
      const groceries = ok(await phone.createList('Groceries'));
      ok(await phone.createTask(groceries, 'Buy milk'));
      await phone.sync();

      // Then she sees that sync is stuck and why
      expect(phone.status()).toBe('app-outdated');

      // And her unsynced changes are still on the device
      expect(titles(phone)).toEqual(['Buy milk']);
      expect(phone.pending()).not.toEqual([]);
    } finally {
      await outdated.close();
    }
  });
});
