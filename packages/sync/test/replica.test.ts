import { describe, expect, test, vi } from 'vitest';
import { compareHlc } from '../src/hlc.ts';
import { Replica } from '../src/replica.ts';
import { MemoryStore, type ReplicaStore } from '../src/store.ts';
import { SessionError, type Transport } from '../src/transport.ts';
import {
  createFakeServer,
  failing,
  offline,
  repeatFirstPage,
  switchable,
  type FakeServer,
} from './fake-transport.ts';
import { at, createLink, createList, createTask, grant, setField } from './ops.ts';

const alice = 'alice';
const bob = 'bob';
const T0 = 1_800_000_000_000;

/** Alice's Inbox with "Buy paint" and "Paint fence", and bob's Shed shared with her as a viewer. */
function world(): FakeServer {
  const server = createFakeServer();
  server.seed(
    createList('inbox', at(1), alice),
    setField('list', 'inbox', 'title', 'Inbox', at(2), alice),
    createTask('paint', 'inbox', at(3), alice),
    setField('task', 'paint', 'title', 'Buy paint', at(4), alice),
    createTask('fence', 'inbox', at(5), alice),
    setField('task', 'fence', 'title', 'Paint fence', at(6), alice),
    createList('shed', at(7, 'b'), bob),
    grant('g1', alice, { kind: 'list', id: 'shed' }, 'viewer', at(8, 'b'), bob),
  );
  return server;
}

async function device(
  server: FakeServer,
  opts: { transport?: Transport; store?: ReplicaStore; onError?: (error: unknown) => void } = {},
) {
  const store = opts.store ?? new MemoryStore();
  const net = switchable(opts.transport ?? server.transport(alice));
  let time = T0;
  const replica = await Replica.open({
    store,
    transport: net,
    userId: alice,
    deviceId: 'phone',
    now: () => (time += 1_000),
    ...(opts.onError === undefined ? {} : { onError: opts.onError }),
  });
  await replica.sync();
  return { replica, store, net };
}

type Mutation = Exclude<keyof ReplicaStore, 'load'>;

/**
 * A MemoryStore that, once `crashAt` names a method, dies at the next call of it: that call and
 * every later write throw `store-crashed` without changing anything, as if the app had crashed.
 */
function crashingStore(): { store: ReplicaStore; inner: MemoryStore; crashAt(method: Mutation): void } {
  const inner = new MemoryStore();
  let target: Mutation | null = null;
  let dead = false;
  const write =
    <A extends unknown[]>(method: Mutation, fn: (...args: A) => Promise<void>) =>
    (...args: A): Promise<void> => {
      if (method === target) dead = true;
      return dead ? Promise.reject(new Error('store-crashed')) : fn(...args);
    };
  const store: ReplicaStore = {
    load: () => inner.load(),
    init: write('init', (u: string, d: string) => inner.init(u, d)),
    appendConfirmed: write('appendConfirmed', (ops: Parameters<ReplicaStore['appendConfirmed']>[0], c: number) => inner.appendConfirmed(ops, c)),
    forget: write('forget', (r: Parameters<ReplicaStore['forget']>[0], c: number) => inner.forget(r, c)),
    putPending: write('putPending', (op: Parameters<ReplicaStore['putPending']>[0]) => inner.putPending(op)),
    removePending: write('removePending', (id: string) => inner.removePending(id)),
    putRejected: write('putRejected', (r: Parameters<ReplicaStore['putRejected']>[0]) => inner.putRejected(r)),
    removeRejected: write('removeRejected', (id: string) => inner.removeRejected(id)),
    wipe: write('wipe', () => inner.wipe()),
  };
  return {
    store,
    inner,
    crashAt(method) {
      target = method;
    },
  };
}

const titles = (replica: Replica): string[] => [...replica.state().tasks.values()].map((t) => t.title);

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error('expected ok');
  return result.value;
};

describe('Replica', () => {
  describe('edits while offline', () => {
    test('are shown at once and kept pending', async () => {
      const server = world();
      const { replica, net } = await device(server);
      net.use(offline());

      const milk = unwrap(await replica.createTask('inbox', 'Buy milk'));
      const link = await replica.addLink('paint', 'fence');
      await replica.sync();

      expect(titles(replica)).toContain('Buy milk');
      expect(replica.state().tasks.get(milk)?.listId).toBe('inbox');
      if (!link.ok) throw new Error('expected ok');
      expect(replica.state().links.get(link.id)).toMatchObject({ prerequisiteId: 'paint', postrequisiteId: 'fence' });
      expect(replica.pending()).toHaveLength(3);
      expect(replica.status()).toBe('offline');
    });

    test('are pushed once the transport works again', async () => {
      const server = world();
      const { replica, net } = await device(server);
      net.use(offline());
      await replica.createTask('inbox', 'Buy milk');
      await replica.addLink('paint', 'fence');
      await replica.sync();

      net.use(server.transport(alice));
      await replica.sync();

      expect(replica.pending()).toEqual([]);
      expect(replica.status()).toBe('ok');
      expect(titles(replica)).toContain('Buy milk');
      expect(replica.state().links.size).toBe(1);
    });

    test('survive reopening the replica from its store', async () => {
      const server = world();
      const { replica, store, net } = await device(server);
      net.use(offline());
      await replica.createTask('inbox', 'Buy milk');
      await replica.sync();

      const reopened = await Replica.open({ store, transport: offline(), userId: alice, deviceId: 'phone' });

      expect(titles(reopened)).toEqual(expect.arrayContaining(['Buy paint', 'Paint fence', 'Buy milk']));
      expect(reopened.pending()).toEqual(replica.pending());
    });
  });

  describe('validation', () => {
    test('a blank title is required and nothing is pending', async () => {
      const { replica } = await device(world());
      expect(await replica.createTask('inbox', '   ')).toEqual({ ok: false, errors: [{ field: 'title', code: 'required' }] });
      expect(replica.pending()).toEqual([]);
    });

    test('surrounding whitespace is stripped', async () => {
      const { replica } = await device(world());
      const id = unwrap(await replica.createTask('inbox', '  Buy milk  '));
      expect(replica.state().tasks.get(id)?.title).toBe('Buy milk');
    });

    test('adding a task to a list the user can only view is forbidden', async () => {
      const { replica } = await device(world());
      expect(await replica.createTask('shed', 'Oil hinges')).toEqual({
        ok: false,
        errors: [{ field: 'listId', code: 'forbidden' }],
      });
      expect(replica.pending()).toEqual([]);
    });

    test('a task can be added to a list created locally', async () => {
      const { replica, net } = await device(world());
      net.use(offline());
      const house = unwrap(await replica.createList('House'));
      const id = unwrap(await replica.createTask(house, 'Fix roof'));
      expect(replica.state().lists.get(house)).toMatchObject({ title: 'House', ownerId: alice });
      expect(replica.state().tasks.get(id)?.listId).toBe(house);
    });

    test('a field edit is validated and normalized', async () => {
      const { replica } = await device(world());
      expect(await replica.setTaskField('paint', 'completedAt', 'yesterday')).toEqual({
        ok: false,
        errors: [{ field: 'completedAt', code: 'invalid' }],
      });
      expect(await replica.setTaskField('paint', 'title', '  Buy blue paint ')).toEqual({ ok: true, value: undefined });
      expect(replica.state().tasks.get('paint')?.title).toBe('Buy blue paint');
    });

    test('a link that would form a cycle is rejected with the graph rule', async () => {
      const { replica } = await device(world());
      await replica.addLink('paint', 'fence');
      expect(await replica.addLink('fence', 'paint')).toEqual({
        ok: false,
        rejection: { code: 'cycle', prerequisiteId: 'fence', postrequisiteId: 'paint' },
      });
    });
  });

  describe('rejection', () => {
    test('a rejected edit moves to rejected and the state shows the previous value', async () => {
      const server = world();
      const { replica } = await device(server);
      server.reject = (op) => (op.content?.field === 'title' ? { code: 'not-found' } : undefined);

      await replica.setTaskField('paint', 'title', 'Buy blue paint');
      expect(replica.state().tasks.get('paint')?.title).toBe('Buy blue paint');
      await replica.sync();

      expect(replica.pending()).toEqual([]);
      expect(replica.rejected()).toHaveLength(1);
      expect(replica.rejected()[0]).toMatchObject({
        code: 'not-found',
        op: { content: { field: 'title', value: 'Buy blue paint' } },
        at: new Date(T0 + 2_000).toISOString(),
      });
      expect(replica.state().tasks.get('paint')?.title).toBe('Buy paint');
    });

    test('discardRejected removes it', async () => {
      const server = world();
      const { replica, store } = await device(server);
      server.reject = () => ({ code: 'not-found' });
      await replica.setTaskField('paint', 'title', 'Buy blue paint');
      await replica.sync();
      const [rejected] = replica.rejected();
      if (rejected === undefined) throw new Error('expected a rejected op');

      await replica.discardRejected(rejected.op.id);

      expect(replica.rejected()).toEqual([]);
      expect((await store.load())?.rejected).toEqual([]);
    });
  });

  describe('duplicate link', () => {
    test('folds the local link into the existing one, keeping the original HLCs', async () => {
      const server = world();
      const { replica } = await device(server);
      server.seed(
        createLink('L0', 'paint', 'fence', at(10, 'b'), bob),
        setField('link', 'L0', 'reason', 'Old reason', at(11, 'b'), bob),
      );
      const added = await replica.addLink('paint', 'fence');
      if (!added.ok) throw new Error('expected ok');
      await replica.setLinkField(added.id, 'reason', 'Need color');
      const original = replica.pending().find((op) => op.content?.value === 'Need color');
      server.reject = (op) =>
        op.record.id !== added.id
          ? undefined
          : op.meta?.kind === 'createLink'
            ? { code: 'duplicate-link', existingLinkId: 'L0' }
            : { code: 'not-found' };

      await replica.sync();

      expect(replica.state().links.has(added.id)).toBe(false);
      const folded = server.entries.find(
        (e) => e.kind === 'op' && e.op.record.id === 'L0' && e.op.content?.field === 'reason' && e.op.hlc === original?.hlc,
      );
      expect(folded).toBeDefined();
      expect(folded?.kind === 'op' && folded.op.id).not.toBe(original?.id);
      expect(replica.state().links.get('L0')?.reason).toBe('Need color');
      expect(replica.rejected()).toEqual([]);
      expect(replica.pending()).toEqual([]);
    });
  });

  describe('duplicate link without user-set fields', () => {
    test('keeps the existing link\'s reason when the local link set none', async () => {
      const server = world();
      const { replica } = await device(server);
      server.seed(
        createLink('L0', 'paint', 'fence', at(10, 'b'), bob),
        setField('link', 'L0', 'reason', 'Old reason', at(11, 'b'), bob),
      );
      const added = await replica.addLink('paint', 'fence');
      if (!added.ok) throw new Error('expected ok');
      expect(replica.pending()).toHaveLength(1);
      server.reject = (op) => (op.record.id === added.id ? { code: 'duplicate-link', existingLinkId: 'L0' } : undefined);

      await replica.sync();

      expect(replica.state().links.get('L0')).toMatchObject({ kind: 'hard', reason: 'Old reason' });
      expect(replica.pending()).toEqual([]);
    });
  });

  describe('crash during a link fold', () => {
    test.each<Mutation>(['putPending', 'removePending'])('a crash at %s loses no link edit', async (method) => {
      const server = world();
      const crashing = crashingStore();
      const { replica } = await device(server, { store: crashing.store });
      server.seed(
        createLink('L0', 'paint', 'fence', at(10, 'b'), bob),
        setField('link', 'L0', 'reason', 'Old reason', at(11, 'b'), bob),
      );
      const added = await replica.addLink('paint', 'fence', 'hard', 'Need color');
      if (!added.ok) throw new Error('expected ok');
      server.reject = (op) =>
        op.record.id !== added.id
          ? undefined
          : op.meta?.kind === 'createLink'
            ? { code: 'duplicate-link', existingLinkId: 'L0' }
            : { code: 'not-found' };

      crashing.crashAt(method);
      await expect(replica.sync()).rejects.toThrow('store-crashed');

      const stored = (await crashing.inner.load())?.pending ?? [];
      expect(stored.some((op) => op.content?.value === 'Need color')).toBe(true);
      const restarted = await Replica.open({ store: crashing.inner, transport: server.transport(alice), userId: alice, deviceId: 'phone' });
      await restarted.sync();
      expect(restarted.state().links.get('L0')?.reason).toBe('Need color');
      expect(restarted.pending()).toEqual([]);
    });
  });

  describe('forget', () => {
    test('drops the task, links touching it, and its history', async () => {
      const server = world();
      const { replica, store } = await device(server);
      await replica.addLink('paint', 'fence');
      await replica.sync();
      expect(replica.history('paint').length).toBeGreaterThan(2);

      server.forget({ type: 'task', id: 'paint' });
      await replica.sync();

      expect(replica.state().tasks.has('paint')).toBe(false);
      expect(replica.state().links.size).toBe(0);
      expect(replica.history('paint')).toEqual([]);
      expect(replica.history('fence')).toHaveLength(2);
      const stored = await store.load();
      expect(stored?.confirmed.some((op) => op.record.id === 'paint' || op.record.type === 'link')).toBe(false);
    });
  });

  describe('sessions', () => {
    test('session-revoked wipes everything, including pending operations', async () => {
      const { replica, store, net } = await device(world());
      await replica.createTask('inbox', 'Buy milk');
      net.use(failing(new SessionError('session-revoked')));

      await replica.sync();

      expect(replica.status()).toBe('revoked');
      expect(await store.load()).toBeNull();
      expect(replica.state().tasks.size).toBe(0);
      expect(replica.state().lists.size).toBe(0);
      expect(replica.pending()).toEqual([]);
    });

    test('session-expired logs out and keeps pending operations', async () => {
      const { replica, store, net } = await device(world());
      await replica.createTask('inbox', 'Buy milk');
      net.use(failing(new SessionError('session-expired')));

      await replica.sync();

      expect(replica.status()).toBe('logged-out');
      expect(replica.pending()).toHaveLength(2);
      expect((await store.load())?.pending).toHaveLength(2);
      expect(titles(replica)).toContain('Buy milk');
    });
  });

  test('pulling the same page twice does not duplicate history', async () => {
    const server = world();
    const { replica, store } = await device(server, { transport: repeatFirstPage(server.transport(alice)) });
    expect(replica.history('paint')).toHaveLength(2);
    expect((await store.load())?.confirmed).toHaveLength(server.entries.length);
  });

  test('after pulling an operation from the future, the next local operation is later', async () => {
    const server = world();
    const future = at(T0 + 10_000_000, 'b');
    server.seed(setField('task', 'paint', 'title', 'Buy red paint', future, bob));
    const { replica } = await device(server);

    await replica.setTaskField('paint', 'title', 'Buy paint');

    const [op] = replica.pending();
    expect(op && compareHlc(op.hlc, future)).toBe(1);
    expect(replica.state().tasks.get('paint')?.title).toBe('Buy paint');
  });

  test('pushes in batches of up to 500', async () => {
    const server = world();
    const { replica } = await device(server);
    for (let i = 0; i < 251; i++) await replica.createTask('inbox', `Task ${String(i)}`);
    server.pushSizes.length = 0;

    await replica.sync();

    expect(server.pushSizes).toEqual([500, 2]);
    expect(replica.pending()).toEqual([]);
  });

  test('overlapping sync calls are coalesced', async () => {
    const server = world();
    const { replica } = await device(server);
    await replica.createTask('inbox', 'Buy milk');
    server.pushSizes.length = 0;

    await Promise.all([replica.sync(), replica.sync(), replica.sync()]);

    expect(server.pushSizes).toEqual([2]);
  });

  test('a store failure during a live sync reaches onError', async () => {
    const server = world();
    const crashing = crashingStore();
    const errors: unknown[] = [];
    const { replica } = await device(server, { store: crashing.store, onError: (e) => errors.push(e) });
    const stop = replica.startLive();
    crashing.crashAt('appendConfirmed');

    server.seed(createTask('milk', 'inbox', at(20, 'b'), bob));

    await vi.waitFor(() => {
      expect(errors).toEqual([new Error('store-crashed')]);
    });
    stop();
  });

  test('startLive syncs when the feed grows', async () => {
    const server = world();
    const { replica } = await device(server);
    const stop = replica.startLive();

    server.seed(createTask('milk', 'inbox', at(20, 'b'), bob), setField('task', 'milk', 'title', 'Milk', at(21, 'b'), bob));

    await vi.waitFor(() => {
      expect(titles(replica)).toContain('Milk');
    });
    stop();
  });
});

describe('push batching', () => {
  test('large operations are pushed in batches that stay within the size bound', async () => {
    const server = world();
    const base = server.transport(alice);
    const sizes: number[] = [];
    const transport: Transport = {
      ...base,
      push(ops) {
        sizes.push(JSON.stringify({ ops }).length * 3);
        return base.push(ops);
      },
    };
    const { replica } = await device(server, { transport });
    const notes = 'é'.repeat(100_000);
    for (let i = 0; i < 20; i++) await replica.createTask('inbox', `Large ${String(i)}`, notes);
    await replica.sync();
    expect(sizes.length).toBeGreaterThan(1);
    for (const size of sizes) expect(size).toBeLessThanOrEqual(768 * 1024);
    expect(replica.pending()).toEqual([]);
  });

  test('1,200 tiny operations go in batches of 500, 500 and 200', async () => {
    const server = world();
    const { replica } = await device(server);
    for (let i = 0; i < 600; i++) await replica.createTask('inbox', `T${String(i)}`);
    server.pushSizes.length = 0;
    await replica.sync();
    expect(server.pushSizes).toEqual([500, 500, 200]);
  });
});
