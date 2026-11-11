import { newId, type Id } from '@tdl/domain';
import { createClock, type JsonValue, type Operation, type PushResult } from '@tdl/sync';
import { sql, type SQL } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { writeServerOps } from '../src/sync/apply.ts';
import { auth, bearerOf, logIn, signUp } from './auth-helpers.ts';
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
const set = (type: 'list' | 'task' | 'link', id: Id, field: string, value: JsonValue) =>
  op({ type, id }, { content: { field, value } });

describe('push', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  let alice: string;
  let aliceLaptop: string;
  let bob: string;
  let aliceId: Id;
  let bobId: Id;
  let inbox: Id;
  const house = newId();
  const paintFence = newId();
  const buyPaint = newId();

  const me = async (token: string) => (await server.app.inject({ url: '/me', headers: auth(token) })).json<{ userId: Id; defaultListId: Id }>();
  const push = async (token: string, ops: Operation[]) => {
    const response = await server.app.inject({ method: 'POST', url: '/sync/push', headers: auth(token), payload: { ops } });
    expect(response.statusCode).toBe(200);
    return response.json<{ results: PushResult[] }>().results;
  };
  const accepted = async (token: string, ops: Operation[]) => {
    const results = await push(token, ops);
    expect(results.map((r) => r.status)).toEqual(ops.map(() => 'accepted'));
    return results;
  };
  const feedUsers = async (opId: Id) =>
    (
      await server.db.execute<{ user_id: Id }>(sql`
        select f.user_id from feed f join operations o on o.seq = f.op_seq where o.id = ${opId} order by f.user_id`)
    ).rows.map((r) => r.user_id);
  const rows = async (query: SQL) => (await server.db.execute<Record<string, unknown>>(query)).rows;
  const count = async (table: 'operations' | 'feed') =>
    Number((await server.db.execute<{ n: string }>(sql`select count(*) as n from ${sql.identifier(table)}`)).rows[0]?.n);

  beforeAll(async () => {
    server = await testApp();
    alice = await signUp(server.app, 'alice');
    bob = await signUp(server.app, 'bob');
    aliceLaptop = bearerOf((await logIn(server.app, 'alice', undefined, 'laptop')).headers);
    ({ userId: aliceId, defaultListId: inbox } = await me(alice));
    ({ userId: bobId } = await me(bob));
    await accepted(alice, [
      createList(house),
      set('list', house, 'title', 'House'),
      createTask(paintFence, house),
      set('task', paintFence, 'title', 'Paint fence'),
      createTask(buyPaint, house),
      set('task', buyPaint, 'title', 'Buy paint'),
    ]);
  });
  afterAll(async () => {
    await server.close();
  });

  test('alice creates a task in her Inbox: both operations accepted, in order, in her feed only', async () => {
    const task = newId();
    const ops = [createTask(task, inbox), set('task', task, 'title', 'Call mum')];
    const results = await push(alice, ops);
    expect(results).toEqual([
      { id: ops[0]?.id, status: 'accepted', seq: expect.any(Number) as unknown },
      { id: ops[1]?.id, status: 'accepted', seq: expect.any(Number) as unknown },
    ]);
    const [first, second] = results;
    expect(first?.status === 'accepted' && second?.status === 'accepted' && second.seq > first.seq).toBe(true);
    expect(await feedUsers(ops[0]?.id ?? '')).toEqual([aliceId]);
    expect(await feedUsers(ops[1]?.id ?? '')).toEqual([aliceId]);
    expect(await rows(sql`select list_id from tasks where id = ${task}`)).toEqual([{ list_id: inbox }]);
  });

  test('pushing the same batch again gives the same results and writes nothing', async () => {
    const task = newId();
    const ops = [createTask(task, inbox), set('task', task, 'title', 'Water plants')];
    const first = await push(alice, ops);
    const before = [await count('operations'), await count('feed')];
    expect(await push(alice, ops)).toEqual(first);
    expect(await push(aliceLaptop, ops)).toEqual(first);
    expect([await count('operations'), await count('feed')]).toEqual(before);
  });

  test('the same operation pushed from two devices at once is stored once', async () => {
    const ops = [set('task', paintFence, 'notes', 'sand first')];
    const [phone, laptop] = await Promise.all([push(alice, ops), push(aliceLaptop, ops)]);
    expect(laptop).toEqual(phone);
    expect(phone[0]?.status).toBe('accepted');
    expect((await rows(sql`select seq from operations where id = ${ops[0]?.id ?? ''}`))).toHaveLength(1);
  });

  test("bob's task in alice's Inbox is not found, and so is his title for it", async () => {
    const task = newId();
    const ops = [createTask(task, inbox), set('task', task, 'title', 'Sneaky')];
    const before = [await count('operations'), await count('feed')];
    expect(await push(bob, ops)).toEqual([
      { id: ops[0]?.id, status: 'rejected', code: 'not-found' },
      { id: ops[1]?.id, status: 'rejected', code: 'not-found' },
    ]);
    expect([await count('operations'), await count('feed')]).toEqual(before);
    expect((await rows(sql`select id from tasks where id = ${task}`))).toEqual([]);
  });

  test('a blank title is invalid', async () => {
    const ops = [set('task', paintFence, 'title', '  ')];
    expect(await push(alice, ops)).toEqual([
      { id: ops[0]?.id, status: 'rejected', code: 'invalid', errors: [{ field: 'title', code: 'required' }] },
    ]);
  });

  test('an unknown field is invalid', async () => {
    const ops = [set('task', paintFence, 'colour', 'red')];
    expect(await push(alice, ops)).toEqual([
      { id: ops[0]?.id, status: 'rejected', code: 'invalid', errors: [{ field: 'colour', code: 'unknown-field' }] },
    ]);
  });

  test('a record type that does not match the operation is invalid', async () => {
    const id = newId();
    const ops = [
      op({ type: 'link', id }, { meta: { kind: 'createTask', listId: inbox } }),
      op({ type: 'task', id }, { meta: { kind: 'createList' } }),
      op({ type: 'list', id: house }, { meta: { kind: 'removeLink' } }),
      op({ type: 'task', id: paintFence }, { meta: { kind: 'grant', userId: bobId, target: { kind: 'list', id: house }, role: 'viewer' } }),
      op({ type: 'grant', id }, { content: { field: 'title', value: 'x' } }),
    ];
    const results = await push(alice, ops);
    expect(results.map((r) => (r.status === 'rejected' ? r.code : r.status))).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'invalid']);
    expect((await rows(sql`select id from tasks where id = ${id}`))).toEqual([]);
  });

  test('creating a list or task whose ID already exists is forbidden', async () => {
    const ops = [createList(house), createTask(paintFence, inbox)];
    expect((await push(alice, ops)).map((r) => (r.status === 'rejected' ? r.code : r.status))).toEqual(['forbidden', 'forbidden']);
    expect((await rows(sql`select list_id from tasks where id = ${paintFence}`))).toEqual([{ list_id: house }]);
  });

  describe('with bob on House', () => {
    const grantId = newId();
    afterAll(async () => {
      await server.db.execute(sql`delete from grants where id = ${grantId}`);
    });

    test('a viewer cannot complete Paint fence; an editor can, and both see it', async () => {
      await server.db.execute(sql`insert into grants (id, user_id, target_kind, target_id, role) values (${grantId}, ${bobId}, 'list', ${house}, 'viewer')`);
      const asViewer = [set('task', paintFence, 'completedAt', '2026-11-11T10:00:00Z')];
      expect(await push(bob, asViewer)).toEqual([{ id: asViewer[0]?.id, status: 'rejected', code: 'forbidden' }]);

      await server.db.execute(sql`update grants set role = 'editor' where id = ${grantId}`);
      const asEditor = [set('task', paintFence, 'completedAt', '2026-11-11T10:00:00Z')];
      await accepted(bob, asEditor);
      expect(await feedUsers(asEditor[0]?.id ?? '')).toEqual([aliceId, bobId].sort());
    });

    test('only the owner may change editorsCanShare; editors may change the title', async () => {
      const byBob = [set('list', house, 'editorsCanShare', true), set('list', house, 'title', 'Home')];
      expect((await push(bob, byBob)).map((r) => (r.status === 'rejected' ? r.code : r.status))).toEqual(['forbidden', 'accepted']);
      expect((await rows(sql`select editors_can_share from lists where id = ${house}`))).toEqual([{ editors_can_share: false }]);

      await accepted(alice, [set('list', house, 'editorsCanShare', true)]);
      expect((await rows(sql`select editors_can_share from lists where id = ${house}`))).toEqual([{ editors_can_share: true }]);
      await accepted(alice, [set('list', house, 'editorsCanShare', false)]);
    });

    test("an editor may not move a task out of alice's lists into his own", async () => {
      const ops = [moveTask(buyPaint, (await me(bob)).defaultListId)];
      expect(await push(bob, ops)).toEqual([{ id: ops[0]?.id, status: 'rejected', code: 'forbidden' }]);
      expect((await rows(sql`select list_id from tasks where id = ${buyPaint}`))).toEqual([{ list_id: house }]);
    });
  });

  test('moving a task updates its list and fans out to the new audience', async () => {
    const task = newId();
    await accepted(alice, [createTask(task, inbox)]);
    const ops = [moveTask(task, house)];
    await accepted(alice, ops);
    expect((await rows(sql`select list_id from tasks where id = ${task}`))).toEqual([{ list_id: house }]);
    expect(await feedUsers(ops[0]?.id ?? '')).toEqual([aliceId]);
  });

  test('moving a task bob cannot see is not found', async () => {
    const ops = [moveTask(paintFence, inbox)];
    expect(await push(bob, ops)).toEqual([{ id: ops[0]?.id, status: 'rejected', code: 'not-found' }]);
  });

  test('two devices racing to add the same link: one accepted, one duplicate-link; the reverse link is kept', async () => {
    const a = newId();
    const b = newId();
    await accepted(alice, [createTask(a, house), createTask(b, house)]);
    const fromPhone = createLink(newId(), a, b);
    const fromLaptop = createLink(newId(), a, b);
    const [phone, laptop] = await Promise.all([push(alice, [fromPhone]), push(aliceLaptop, [fromLaptop])]);
    const results = [phone[0], laptop[0]];
    const winner = results.find((r) => r?.status === 'accepted');
    const loser = results.find((r) => r?.status === 'rejected');
    expect(winner).toBeDefined();
    const winnerLinkId = winner?.id === fromPhone.id ? fromPhone.record.id : fromLaptop.record.id;
    expect(loser).toEqual({ id: loser?.id, status: 'rejected', code: 'duplicate-link', existingLinkId: winnerLinkId });
    expect((await rows(sql`select id from links where prerequisite_id = ${a} and postrequisite_id = ${b}`))).toEqual([
      { id: winnerLinkId },
    ]);
    expect((await rows(sql`select id from operations where id = ${loser?.id ?? ''}`))).toEqual([]);

    await accepted(alice, [createLink(newId(), b, a)]);
  });

  test('a link to a task the pusher cannot see is not found', async () => {
    const ops = [createLink(newId(), paintFence, buyPaint)];
    expect(await push(bob, ops)).toEqual([{ id: ops[0]?.id, status: 'rejected', code: 'not-found' }]);
  });

  test('removing a link deletes it; a later reason for it is not found', async () => {
    const link = newId();
    const created = [createLink(link, buyPaint, paintFence), set('link', link, 'reason', 'need paint')];
    await accepted(alice, created);
    expect(await feedUsers(created[1]?.id ?? '')).toEqual([aliceId]);
    await accepted(alice, [removeLink(link)]);
    expect((await rows(sql`select id from links where id = ${link}`))).toEqual([]);
    const late = [set('link', link, 'reason', 'too late')];
    expect(await push(alice, late)).toEqual([{ id: late[0]?.id, status: 'rejected', code: 'not-found' }]);
  });

  test('a device-sent grant is forbidden', async () => {
    const ops = [op({ type: 'grant', id: newId() }, { meta: { kind: 'grant', userId: bobId, target: { kind: 'list', id: house }, role: 'editor' } })];
    expect(await push(alice, ops)).toEqual([{ id: ops[0]?.id, status: 'rejected', code: 'forbidden' }]);
    expect((await rows(sql`select id from grants where target_id = ${house}`))).toEqual([]);
  });

  test("reusing another user's operation ID is forbidden", async () => {
    const [mine] = await accepted(alice, [set('task', paintFence, 'notes', 'two coats')]);
    const theirs = { ...set('list', (await me(bob)).defaultListId, 'title', 'Mine'), id: mine?.id ?? '' };
    expect(await push(bob, [theirs])).toEqual([{ id: theirs.id, status: 'rejected', code: 'forbidden' }]);
  });

  test('a server-made grant is stored and reaches the grantee and the owner', async () => {
    const grantId = newId();
    await server.db.transaction(async (tx) => {
      await writeServerOps(tx, aliceId, [
        { id: newId(), record: { type: 'grant', id: grantId }, meta: { kind: 'grant', userId: bobId, target: { kind: 'list', id: house }, role: 'viewer' }, content: null },
      ], Date.now);
    });
    expect((await rows(sql`select user_id, role from grants where id = ${grantId}`))).toEqual([{ user_id: bobId, role: 'viewer' }]);
    const users = await server.db.execute<{ user_id: Id }>(sql`select user_id from feed where record_id = ${grantId} order by user_id`);
    expect(users.rows.map((r) => r.user_id)).toEqual([aliceId, bobId].sort());
  });

  test('pushing without a session is 401', async () => {
    const response = await server.app.inject({ method: 'POST', url: '/sync/push', payload: { ops: [] } });
    expect(response.statusCode).toBe(401);
  });
});
