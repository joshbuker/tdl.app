import type { FeedOp, Operation, RecordRef, RejectedOp, ReplicaStore } from '@tdl/sync';
import { describe, expect, test } from 'vitest';

let counter = 0;

const operation = (record: RecordRef, meta: Operation['meta'], content: Operation['content'] = null): Operation => {
  counter += 1;
  return { id: `op-${String(counter)}`, hlc: `${String(counter).padStart(15, '0')}:000000:a`, record, meta, content };
};

const confirmed = (op: Operation, seq: number): FeedOp => ({ ...op, seq, authorId: 'author' });

export const ops = {
  createList: (id: string): Operation => operation({ type: 'list', id }, { kind: 'createList' }),
  createTask: (id: string, listId: string): Operation => operation({ type: 'task', id }, { kind: 'createTask', listId }),
  createLink: (id: string, prerequisiteId: string, postrequisiteId: string): Operation =>
    operation({ type: 'link', id }, { kind: 'createLink', prerequisiteId, postrequisiteId }),
  setTitle: (type: RecordRef['type'], id: string, title: string): Operation =>
    operation({ type, id }, null, { field: 'title', value: title }),
  confirmed,
};

/** The behavior every ReplicaStore shares; `make` returns a fresh, empty store. */
export function describeReplicaStore(name: string, make: () => Promise<ReplicaStore>): void {
  describe(`${name} (ReplicaStore contract)`, () => {
    const initialized = async (): Promise<ReplicaStore> => {
      const store = await make();
      await store.init('user-1', 'device-1');
      return store;
    };

    test('load is null before init', async () => {
      const store = await make();
      expect(await store.load()).toBeNull();
    });

    test('init starts an empty replica for the user and device', async () => {
      const store = await initialized();
      expect(await store.load()).toEqual({
        userId: 'user-1',
        deviceId: 'device-1',
        cursor: 0,
        confirmed: [],
        pending: [],
        rejected: [],
        unknown: [],
      });
    });

    test('init replaces anything stored', async () => {
      const store = await initialized();
      await store.appendConfirmed([confirmed(ops.createList('a'), 1)], 1);
      await store.putPending(ops.createList('b'));
      await store.init('user-2', 'device-2');
      expect(await store.load()).toMatchObject({ userId: 'user-2', deviceId: 'device-2', cursor: 0, confirmed: [], pending: [] });
    });

    test('appendConfirmed skips IDs already stored and sets the cursor', async () => {
      const store = await initialized();
      const first = confirmed(ops.createList('a'), 1);
      const second = confirmed(ops.setTitle('list', 'a', 'Home'), 2);
      await store.appendConfirmed([first], 1);
      await store.appendConfirmed([first, second], 2);
      await store.appendConfirmed([], 3);
      const loaded = await store.load();
      expect(loaded?.confirmed).toEqual([first, second]);
      expect(loaded?.cursor).toBe(3);
    });

    test("forget drops the record's operations and its links'", async () => {
      const store = await initialized();
      const list = confirmed(ops.createList('l'), 1);
      const task = confirmed(ops.createTask('t', 'l'), 2);
      const other = confirmed(ops.createTask('u', 'l'), 3);
      const link = confirmed(ops.createLink('k', 't', 'u'), 4);
      const linkTitle = confirmed(ops.setTitle('link', 'k', 'because'), 5);
      const title = confirmed(ops.setTitle('task', 't', 'Paint'), 6);
      await store.appendConfirmed([list, task, other, link, linkTitle, title], 6);
      await store.forget({ type: 'task', id: 't' }, 7);
      const loaded = await store.load();
      expect(loaded?.confirmed).toEqual([list, other]);
      expect(loaded?.cursor).toBe(7);
    });

    test('pending operations come back in the order they were made', async () => {
      const store = await initialized();
      const made = [ops.createList('c'), ops.createList('a'), ops.createList('b')];
      for (const op of made) await store.putPending(op);
      expect((await store.load())?.pending).toEqual(made);
    });

    test('removePending removes one pending operation', async () => {
      const store = await initialized();
      const [a, b, c] = [ops.createList('a'), ops.createList('b'), ops.createList('c')];
      for (const op of [a, b, c]) await store.putPending(op);
      await store.removePending(b.id);
      expect((await store.load())?.pending).toEqual([a, c]);
    });

    test('rejected operations round-trip, including errors', async () => {
      const store = await initialized();
      const withErrors: RejectedOp = {
        op: ops.setTitle('list', 'a', ''),
        code: 'invalid',
        errors: [{ field: 'title', code: 'required' }],
        at: '2026-11-13T10:00:00.000Z',
      };
      const without: RejectedOp = { op: ops.createTask('t', 'gone'), code: 'not-found', at: '2026-11-13T10:01:00.000Z' };
      await store.putRejected(withErrors);
      await store.putRejected(without);
      expect((await store.load())?.rejected).toEqual([withErrors, without]);
      await store.removeRejected(withErrors.op.id);
      expect((await store.load())?.rejected).toEqual([without]);
    });

    test('unknown entries round-trip, skipping IDs already stored', async () => {
      const store = await initialized();
      const first = { id: 4, kind: 'op', op: { record: { type: 'calendar', id: 'c' }, future: [1, true, null] } };
      const second = { id: 5, kind: 'merge', from: 'a', to: 'b' };
      await store.putUnknown([first], 4);
      await store.putUnknown([first, second], 5);
      let loaded = await store.load();
      expect(loaded?.unknown).toEqual([first, second]);
      expect(loaded?.cursor).toBe(5);
      await store.removeUnknown([4]);
      loaded = await store.load();
      expect(loaded?.unknown).toEqual([second]);
    });

    test('wipe makes load return null', async () => {
      const store = await initialized();
      await store.appendConfirmed([confirmed(ops.createList('a'), 1)], 1);
      await store.putPending(ops.createList('b'));
      await store.wipe();
      expect(await store.load()).toBeNull();
    });

    test('every method but load and init throws store-not-initialized before init', async () => {
      const store = await make();
      const op = ops.createList('a');
      const calls: (() => Promise<void>)[] = [
        () => store.appendConfirmed([confirmed(op, 1)], 1),
        () => store.forget({ type: 'list', id: 'a' }, 1),
        () => store.putUnknown([{ id: 1, kind: 'new' }], 1),
        () => store.removeUnknown([1]),
        () => store.putPending(op),
        () => store.removePending(op.id),
        () => store.putRejected({ op, code: 'invalid', at: '2026-11-13T10:00:00.000Z' }),
        () => store.removeRejected(op.id),
      ];
      // MemoryStore throws synchronously; callers await either way, so both count.
      for (const call of calls) await expect((async () => call())()).rejects.toThrow('store-not-initialized');
    });
  });
}
