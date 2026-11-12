// Sync conformance: devices that edit, share and sync at random through lossy, repeating, delayed
// transports still converge, on the state the server's feed describes.
import type { Id } from '@tdl/domain';
import { forgetOps, materialize, pullPageSchema, seededRandom, type DeviceState, type FeedOp, type Replica, type Transport } from '@tdl/sync';
import { and, eq, isNotNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { operations } from '../../src/db/schema.ts';
import { Network, ok, settle, startServer, type TestServer, type User } from '../acceptance/harness.ts';
import { faulty, NO_FAULTS, type Faults } from './faulty-transport.ts';
import { runScript, type Party } from './script.ts';

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const STEPS = 200;

describe('Sync conformance', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  // Each seed's script runs once, for both the tests that check its outcome.
  const runs = new Map<number, Promise<Party[]>>();
  const run = (seed: number): Promise<Party[]> => {
    let result = runs.get(seed);
    if (result === undefined) {
      result = runScript(server, seed, { users: 2, devicesPerUser: 2, steps: STEPS });
      runs.set(seed, result);
    }
    return result;
  };

  /** The state `materialize` gives over the user's whole feed, applying `forget`s as a Replica does. */
  async function serverState(user: User): Promise<DeviceState> {
    let confirmed = new Map<Id, FeedOp>();
    let after = 0;
    for (;;) {
      const reply = await server.request('GET', `/sync/pull?after=${String(after)}&limit=1000`, { token: user.token });
      const page = pullPageSchema.parse(reply.body);
      for (const entry of page.entries) {
        if (entry.kind === 'op') confirmed.set(entry.op.id, entry.op);
        else confirmed = new Map(forgetOps([...confirmed.values()], entry.record).map((op) => [op.id, op]));
      }
      if (!page.more) return materialize(confirmed.values());
      after = page.cursor;
    }
  }

  /** A device whose transport's faults the test can switch on and off. */
  async function faultyDevice(user: User, faults: Faults, seed: number, network = new Network()): Promise<Replica> {
    const rand = seededRandom(seed);
    return server.device(user, { network, wrap: (transport) => faulty(transport, rand, faults) });
  }

  /** The grant giving `user` access, as the replica sees it. */
  function grantOf(replica: Replica, user: User): Id {
    const grant = [...replica.state().grants.values()].find((g) => g.userId === user.userId);
    if (grant === undefined) expect.fail('no grant');
    return grant.id;
  }

  test.each(SEEDS)('Convergence (seed %i)', async (seed) => {
    for (const { devices } of await run(seed)) {
      const [first, ...others] = devices as [Replica, ...Replica[]];
      for (const device of devices) expect(device.pending()).toEqual([]);
      for (const other of others) expect(other.state()).toEqual(first.state());
    }
  });

  test.each(SEEDS)('Matches the server (seed %i)', async (seed) => {
    for (const { user, devices } of await run(seed)) {
      const [first] = devices as [Replica];
      expect(first.state()).toEqual(await serverState(user));
    }
  });

  test('Field-level merge', async () => {
    const alice = await server.signUp('alice');
    const [laptopNet, phoneNet] = [new Network(), new Network()];
    const laptop = await server.device(alice, { network: laptopNet });
    const phone = await server.device(alice, { network: phoneNet });
    const task = ok(await laptop.createTask(alice.defaultListId, 'Paint fence'));
    await settle(laptop, phone);

    // Both devices edit the same task offline, each a different field.
    laptopNet.online = false;
    phoneNet.online = false;
    ok(await laptop.setTaskField(task, 'title', 'Paint the fence'));
    ok(await phone.setTaskField(task, 'notes', 'Use the blue paint'));
    laptopNet.online = true;
    phoneNet.online = true;
    await settle(laptop, phone);

    const merged = { title: 'Paint the fence', notes: 'Use the blue paint' };
    for (const device of [laptop, phone, await server.device(alice)]) expect(device.state().tasks.get(task)).toMatchObject(merged);
  });

  test('Newest wins', async () => {
    const alice = await server.signUp('alice');
    // Clocks ahead of the server's, so each rename's HLC is exactly its device's `now`.
    const base = Date.now() + 3_600_000;
    const offsets = [1, 3, 2];
    const networks: Network[] = [];
    const devices: Replica[] = [];
    for (const offset of offsets) {
      const network = new Network();
      networks.push(network);
      devices.push(await server.device(alice, { network, now: () => base + offset }));
    }
    const [first, newest, middle] = devices as [Replica, Replica, Replica];
    const task = ok(await first.createTask(alice.defaultListId, 'Paint fence'));
    await settle(...devices);

    for (const network of networks) network.online = false;
    for (const [i, device] of devices.entries()) ok(await device.setTaskField(task, 'title', `rename ${String(offsets[i])}`));
    const hlcs = devices.map((d) => d.pending()[0]?.hlc.slice(0, 15));
    expect(hlcs).toEqual(offsets.map((offset) => String(base + offset).padStart(15, '0')));

    // The newest rename reaches the server first, and the oldest last.
    for (const network of networks) network.online = true;
    for (const device of [newest, middle, first]) await device.sync();
    await settle(...devices);

    for (const device of [...devices, await server.device(alice)]) expect(device.state().tasks.get(task)?.title).toBe('rename 3');
  });

  test('Catch-up', { timeout: 60_000 }, async () => {
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const house = ok(await alicePhone.createList('House'));
    const secret = ok(await alicePhone.createTask(alice.defaultListId, 'Secret'));
    await settle(alicePhone);
    await server.share(alice, { kind: 'list', id: house }, bob, 'editor');
    await server.share(alice, { kind: 'task', id: secret }, bob, 'viewer');

    const faults: Faults = { ...NO_FAULTS };
    const network = new Network();
    const bobPhone = await faultyDevice(bob, faults, 7, network);
    await settle(alicePhone, bobPhone);
    network.online = false;

    // 2,000 changes while bob is away, with "Secret" unshared and shared again along the way (ending
    // unshared), so forgets fall between operations across many pages.
    const tasks: Id[] = [];
    for (let i = 0; i < 100; i++) tasks.push(ok(await alicePhone.createTask(house, `task ${String(i)}`)));
    for (let i = 0; i < 1800; i++) {
      const id = i % 10 === 0 ? secret : (tasks[i % tasks.length] as Id);
      ok(await alicePhone.setTaskField(id, i % 2 === 0 ? 'title' : 'notes', `change ${String(i)}`));
      if (i % 360 === 359) {
        await settle(alicePhone);
        const grant = [...alicePhone.state().grants.values()].find((g) => g.target.id === secret);
        if (grant === undefined) await server.share(alice, { kind: 'task', id: secret }, bob, 'viewer');
        else expect((await server.request('DELETE', `/grants/${grant.id}`, { token: alice.token })).status).toBe(204);
      }
    }
    await settle(alicePhone);

    // Bob reconnects through a transport that loses and repeats requests.
    network.online = true;
    Object.assign(faults, { drop: 0.2, dropReply: 0.2, duplicate: 0.2, delayMs: [0, 2] });
    for (let attempt = 0; attempt < 100 && (attempt === 0 || bobPhone.status() !== 'ok'); attempt++) await bobPhone.sync();
    expect(bobPhone.status()).toBe('ok');

    expect(bobPhone.state().tasks.has(secret)).toBe(false);
    expect(bobPhone.state()).toEqual((await server.device(bob)).state());
    expect(bobPhone.state()).toEqual(await serverState(bob));
    for (const id of tasks) expect(bobPhone.state().tasks.get(id)).toEqual(alicePhone.state().tasks.get(id));
  });

  test('Grant changes while offline', async () => {
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const house = ok(await alicePhone.createList('House'));
    const [a, b, c] = [
      ok(await alicePhone.createTask(house, 'A')),
      ok(await alicePhone.createTask(house, 'B')),
      ok(await alicePhone.createTask(house, 'C')),
    ];
    const ab = await alicePhone.addLink(a, b);
    if (!ab.ok) expect.fail(JSON.stringify(ab.rejection));
    await settle(alicePhone);
    const network = new Network();
    const bobPhone = await server.device(bob, { network });
    network.online = false;

    // While bob is offline, alice shares House, edits it, removes him, edits again, and re-shares it.
    await server.share(alice, { kind: 'list', id: house }, bob, 'editor');
    ok(await alicePhone.setTaskField(a, 'title', 'A, shared'));
    const bc = await alicePhone.addLink(b, c);
    if (!bc.ok) expect.fail(JSON.stringify(bc.rejection));
    ok(await alicePhone.removeLink(ab.id));
    await settle(alicePhone);
    expect((await server.request('DELETE', `/grants/${grantOf(alicePhone, bob)}`, { token: alice.token })).status).toBe(204);
    ok(await alicePhone.setTaskField(c, 'notes', 'while bob was removed'));
    ok(await alicePhone.removeLink(bc.id));
    const ca = await alicePhone.addLink(c, a, 'soft');
    if (!ca.ok) expect.fail(JSON.stringify(ca.rejection));
    await settle(alicePhone);
    await server.share(alice, { kind: 'list', id: house }, bob, 'viewer');
    await settle(alicePhone);

    network.online = true;
    await settle(bobPhone, alicePhone);

    const houseOf = (replica: Replica) => {
      const { lists, tasks, links } = replica.state();
      const houseTasks = [...tasks.values()].filter((t) => t.listId === house);
      const ids = new Set(houseTasks.map((t) => t.id));
      return { list: lists.get(house), tasks: houseTasks, links: [...links.values()].filter((l) => ids.has(l.prerequisiteId)) };
    };
    expect(houseOf(bobPhone)).toEqual(houseOf(alicePhone));
    expect(houseOf(bobPhone).links.map((l) => l.id)).toEqual([ca.id]);
    expect(bobPhone.state()).toEqual((await server.device(bob)).state());
    expect(bobPhone.state()).toEqual(await serverState(bob));
  });

  test('Idempotent retries', async () => {
    const alice = await server.signUp('alice');
    const faults: Faults = { drop: 0, dropReply: 0.5, duplicate: 0.5, delayMs: [0, 2] };
    const created = new Set<Id>();
    const recording = (transport: Transport): Transport => ({
      ...transport,
      push: (ops) => {
        for (const op of ops) created.add(op.id);
        return transport.push(ops);
      },
    });
    const rand = seededRandom(42);
    const devices = [
      await server.device(alice, { wrap: (t) => recording(faulty(t, rand, faults)) }),
      await server.device(alice, { wrap: (t) => recording(faulty(t, rand, faults)) }),
    ];

    for (let i = 0; i < 40; i++) {
      const device = devices[i % 2] as Replica;
      const tasks = [...device.state().tasks.keys()];
      if (i % 4 === 0 || tasks.length === 0) ok(await device.createTask(alice.defaultListId, `task ${String(i)}`));
      else ok(await device.setTaskField(tasks[i % tasks.length] as Id, 'title', `rename ${String(i)}`));
      await device.sync();
    }
    Object.assign(faults, NO_FAULTS);
    await settle(...devices);
    for (const device of devices) expect(device.rejected()).toEqual([]);

    const stored = await server.db
      .select({ id: operations.id })
      .from(operations)
      .where(and(eq(operations.authorId, alice.userId), isNotNull(operations.sessionId)));
    expect(stored.length).toBe(created.size);
    expect(new Set(stored.map((op) => op.id))).toEqual(created);
  });
});
