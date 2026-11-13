import { newId, type Id } from '@tdl/domain';
import { createClock, type FeedEntry, type JsonValue, type Operation, type PushResult, type RecordRef } from '@tdl/sync';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { writeServerOps } from '../src/sync/apply.ts';
import { auth, protocol, signUp } from './auth-helpers.ts';
import { testApp } from './db.ts';

const clock = createClock('device', () => Date.now());

const op = (record: Operation['record'], change: { meta: Operation['meta'] } | { content: Operation['content'] }): Operation => ({
  id: newId(),
  hlc: clock.tick(),
  record,
  meta: 'meta' in change ? change.meta : null,
  content: 'content' in change ? change.content : null,
});
const createList = (listId: Id) => op({ type: 'list', id: listId }, { meta: { kind: 'createList' } });
const createTask = (taskId: Id, listId: Id) => op({ type: 'task', id: taskId }, { meta: { kind: 'createTask', listId } });
const moveTask = (taskId: Id, listId: Id) => op({ type: 'task', id: taskId }, { meta: { kind: 'moveTask', listId } });
const createLink = (linkId: Id, prerequisiteId: Id, postrequisiteId: Id) =>
  op({ type: 'link', id: linkId }, { meta: { kind: 'createLink', prerequisiteId, postrequisiteId } });
const removeLink = (linkId: Id) => op({ type: 'link', id: linkId }, { meta: { kind: 'removeLink' } });
const set = (type: 'list' | 'task' | 'link', id: Id, field: string, value: JsonValue) => op({ type, id }, { content: { field, value } });

const describeEntry = (entry: FeedEntry): string => (entry.kind === 'op' ? `op ${entry.op.id}` : `forget ${entry.record.type} ${entry.record.id}`);
const forget = (record: RecordRef) => `forget ${record.type} ${record.id}`;

describe('pull', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  let alice: string;
  let bob: string;
  let carol: string;
  let aliceId: Id;
  let bobId: Id;
  let carolId: Id;
  const house = newId();
  const garden = newId();
  const paintFence = newId();
  const buyPaint = newId();
  const keptLink = newId();
  const removedLink = newId();
  /** Every House operation, in the order alice pushed them. */
  let houseOps: Operation[];
  /** Paint fence's own operations, then those of its links, in order. */
  let paintFenceOwn: Operation[];
  let paintFenceOps: Operation[];
  /** Paint fence's moves, once made. */
  const paintFenceMoves: Operation[] = [];

  const me = async (token: string) => (await server.app.inject({ url: '/api/me', headers: auth(token) })).json<{ userId: Id; defaultListId: Id }>();
  const accepted = async (token: string, ops: Operation[]) => {
    const response = await server.app.inject({ method: 'POST', url: '/api/sync/push', headers: auth(token), payload: { ops } });
    const results = response.json<{ results: PushResult[] }>().results;
    expect(results.map((r) => r.status)).toEqual(ops.map(() => 'accepted'));
  };
  const pull = async (token: string, after: number, limit?: number) => {
    const query = limit === undefined ? `after=${String(after)}` : `after=${String(after)}&limit=${String(limit)}`;
    const response = await server.app.inject({ url: `/api/sync/pull?${query}`, headers: auth(token) });
    expect(response.statusCode).toBe(200);
    return response.json<{ entries: FeedEntry[]; cursor: number; more: boolean }>();
  };
  /** Everything in the user's feed after `after`, and the new cursor. */
  const pullAll = async (token: string, after: number) => {
    const entries: FeedEntry[] = [];
    let cursor = after;
    for (;;) {
      const page = await pull(token, cursor);
      entries.push(...page.entries);
      cursor = page.cursor;
      if (!page.more) return { entries, cursor };
    }
  };
  const serverOp = async (ops: Omit<Operation, 'hlc'>[]) => {
    await server.db.transaction(async (tx) => {
      await writeServerOps(tx, aliceId, ops, Date.now);
    });
  };
  const grantOp = (grantId: Id, userId: Id, target: { kind: 'list' | 'task'; id: Id }): Omit<Operation, 'hlc'> => ({
    id: newId(),
    record: { type: 'grant', id: grantId },
    meta: { kind: 'grant', userId, target, role: 'viewer' },
    content: null,
  });
  const revokeOp = (grantId: Id): Omit<Operation, 'hlc'> => ({ id: newId(), record: { type: 'grant', id: grantId }, meta: { kind: 'revokeGrant' }, content: null });

  beforeAll(async () => {
    server = await testApp();
    alice = await signUp(server.app, 'alice');
    bob = await signUp(server.app, 'bob');
    carol = await signUp(server.app, 'carol');
    ({ userId: aliceId } = await me(alice));
    ({ userId: bobId } = await me(bob));
    ({ userId: carolId } = await me(carol));

    paintFenceOwn = [createTask(paintFence, house), set('task', paintFence, 'title', 'Paint fence')];
    const links = [
      createLink(keptLink, buyPaint, paintFence),
      set('link', keptLink, 'reason', 'need paint'),
      createLink(removedLink, paintFence, buyPaint),
      removeLink(removedLink),
    ];
    houseOps = [
      createList(house),
      set('list', house, 'title', 'House'),
      ...paintFenceOwn,
      createTask(buyPaint, house),
      set('task', buyPaint, 'title', 'Buy paint'),
      ...links,
    ];
    paintFenceOps = [...paintFenceOwn, ...links];
    await accepted(alice, houseOps);
    await accepted(alice, [createList(garden), set('list', garden, 'title', 'Garden')]);
  });
  afterAll(async () => {
    await server.close();
  });

  test('a long feed comes in pages, each entry once and in order', async () => {
    const dave = await signUp(server.app, 'dave');
    const inbox = (await me(dave)).defaultListId;
    const task = newId();
    const ops = [createTask(task, inbox), ...Array.from({ length: 1199 }, (_, i) => set('task', task, 'notes', `note ${String(i)}`))];
    for (let start = 0; start < ops.length; start += 500) await accepted(dave, ops.slice(start, start + 500));

    const pages = [await pull(dave, 0, 500)];
    for (let i = 0; i < 2; i++) pages.push(await pull(dave, pages.at(-1)?.cursor ?? 0, 500));
    expect(pages.map((p) => p.more)).toEqual([true, true, false]);

    const ids = pages.flatMap((p) => p.entries.map((e) => e.id));
    expect(ids.length).toBeGreaterThanOrEqual(1200);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1] ?? Infinity);
    const opIds = pages.flatMap((p) => p.entries.flatMap((e) => (e.kind === 'op' ? [e.op.id] : [])));
    expect(opIds.slice(-1200)).toEqual(ops.map((o) => o.id));
    expect(pages.at(-1)?.cursor).toBe(ids.at(-1));
  });

  /** Resolves once some transaction in this test's database is waiting for an advisory lock, or `stop` is set. */
  const lockWaiter = async (stop: { done: boolean }) => {
    while (!stop.done) {
      const { rows } = await server.db.execute<{ n: string }>(sql`
        select count(*) as n from pg_locks l join pg_database d on d.oid = l.database
        where l.locktype = 'advisory' and not l.granted and d.datname = current_database()`);
      if (Number(rows[0]?.n) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  test('a pull never passes a feed write that has not committed yet', async () => {
    const erin = await signUp(server.app, 'erin');
    const { userId: erinId, defaultListId: inbox } = await me(erin);
    const { cursor } = await pullAll(erin, 0);

    // A server write takes its feed IDs, then stays open.
    const first: Omit<Operation, 'hlc'> = { id: newId(), record: { type: 'list', id: inbox }, meta: null, content: { field: 'title', value: 'Inbox 1' } };
    let release = () => {};
    let written = () => {};
    const isWritten = new Promise<void>((resolve) => (written = resolve));
    const slow = server.db.transaction(async (tx) => {
      await writeServerOps(tx, erinId, [first], Date.now);
      written();
      await new Promise<void>((resolve) => (release = resolve));
    });
    await isWritten;

    // A push starts after it. Unguarded, it would commit a higher feed ID first.
    const second = set('list', inbox, 'title', 'Inbox 2');
    const pushing = accepted(erin, [second]);
    const stop = { done: false };
    await Promise.race([pushing, lockWaiter(stop)]);
    stop.done = true;
    const midway = await pull(erin, cursor);
    release();
    await slow;
    await pushing;

    expect(midway.entries).toEqual([]);
    expect((await pullAll(erin, cursor)).entries.map(describeEntry)).toEqual([`op ${first.id}`, `op ${second.id}`]);
  });

  describe('bob on House', () => {
    let bobCursor = 0;

    test("a grant delivers House's whole history, and revoking it forgets links, then tasks, then the list", async () => {
      ({ cursor: bobCursor } = await pullAll(bob, 0));
      const grantId = newId();
      const grant = grantOp(grantId, bobId, { kind: 'list', id: house });
      await serverOp([grant]);

      const granted = await pullAll(bob, bobCursor);
      bobCursor = granted.cursor;
      expect(granted.entries.map(describeEntry)).toEqual([...houseOps.map((o) => `op ${o.id}`), `op ${grant.id}`]);
      const first = granted.entries[0];
      expect(first?.kind === 'op' && first.op).toMatchObject({ ...houseOps[0], authorId: aliceId, seq: expect.any(Number) as unknown });

      const revoke = revokeOp(grantId);
      await serverOp([revoke]);
      const revoked = await pullAll(bob, bobCursor);
      bobCursor = revoked.cursor;
      const described = revoked.entries.map(describeEntry);
      expect(new Set(described.slice(0, 2))).toEqual(new Set([forget({ type: 'link', id: keptLink }), forget({ type: 'link', id: removedLink })]));
      expect(new Set(described.slice(2, 4))).toEqual(new Set([forget({ type: 'task', id: paintFence }), forget({ type: 'task', id: buyPaint })]));
      expect(described.slice(4)).toEqual([forget({ type: 'list', id: house }), `op ${revoke.id}`]);
    });

    test('granting bob again redelivers the full history', async () => {
      const grant = grantOp(newId(), bobId, { kind: 'list', id: house });
      await serverOp([grant]);
      const granted = await pullAll(bob, bobCursor);
      bobCursor = granted.cursor;
      expect(granted.entries.map(describeEntry)).toEqual([...houseOps.map((o) => `op ${o.id}`), `op ${grant.id}`]);
    });

    test("moving Paint fence to alice's private Garden forgets it for bob; moving it back redelivers it", async () => {
      const away = moveTask(paintFence, garden);
      await accepted(alice, [away]);
      const moved = await pullAll(bob, bobCursor);
      bobCursor = moved.cursor;
      const described = moved.entries.map(describeEntry);
      expect(new Set(described.slice(0, 2))).toEqual(new Set([forget({ type: 'link', id: keptLink }), forget({ type: 'link', id: removedLink })]));
      expect(described.slice(2)).toEqual([forget({ type: 'task', id: paintFence })]);

      const back = moveTask(paintFence, house);
      await accepted(alice, [back]);
      paintFenceMoves.push(away, back);
      const returned = await pullAll(bob, bobCursor);
      bobCursor = returned.cursor;
      expect(returned.entries.map(describeEntry)).toEqual([...paintFenceOps, away, back].map((o) => `op ${o.id}`));
    });
  });

  test("a task grant to carol on Paint fence delivers only Paint fence's operations", async () => {
    const { cursor } = await pullAll(carol, 0);
    const grant = grantOp(newId(), carolId, { kind: 'task', id: paintFence });
    await serverOp([grant]);
    const { entries } = await pullAll(carol, cursor);
    // Buy paint is hidden from carol, so neither link between it and Paint fence comes along.
    expect(entries.map(describeEntry)).toEqual([...paintFenceOwn, ...paintFenceMoves, grant].map((o) => `op ${o.id}`));
  });

  test("after a pull, the session list shows this session's last sync", async () => {
    const before = (await server.app.inject({ url: '/api/sessions', headers: auth(carol) })).json<{ current: boolean; lastSyncedAt: string | null }[]>();
    await pull(carol, 0);
    const sessions = (await server.app.inject({ url: '/api/sessions', headers: auth(carol) })).json<{ current: boolean; lastSyncedAt: string | null }[]>();
    const current = sessions.find((s) => s.current);
    expect(current?.lastSyncedAt).toEqual(expect.any(String));
    expect(before.length).toBe(sessions.length);
  });

  test('a negative cursor is invalid', async () => {
    const response = await server.app.inject({ url: '/api/sync/pull?after=-1', headers: auth(alice) });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ code: 'invalid', errors: [{ field: 'after', code: 'invalid' }] });
  });

  test('pulling without a session is 401', async () => {
    const response = await server.app.inject({ url: '/api/sync/pull?after=0', headers: protocol });
    expect(response.statusCode).toBe(401);
  });

  test('pulling with another major protocol version is 426', async () => {
    const response = await server.app.inject({ url: '/api/sync/pull?after=0', headers: { ...auth(alice), 'tdl-protocol': '2.0' } });
    expect(response.statusCode).toBe(426);
    expect(response.json()).toEqual({ code: 'protocol-mismatch' });
  });
});
