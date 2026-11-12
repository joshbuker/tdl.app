import { newId, type Id } from '@tdl/domain';
import { createClock, type FeedEntry, type JsonValue, type Operation, type PullPage, type PushResult, type RecordRef } from '@tdl/sync';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { auth, signUp } from './auth-helpers.ts';
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
const set = (type: 'list' | 'task' | 'link', id: Id, field: string, value: JsonValue) => op({ type, id }, { content: { field, value } });

const forget = (record: RecordRef) => `forget ${record.type} ${record.id}`;
const describeEntry = (entry: FeedEntry): string => (entry.kind === 'op' ? `op ${entry.op.id}` : forget(entry.record));
const opsOf = (entries: FeedEntry[]) => entries.flatMap((e) => (e.kind === 'op' ? [e.op] : []));

type Target = { kind: 'list' | 'task'; id: Id };

describe('sharing', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  let alice: string;
  let bob: string;
  let carol: string;
  let bobId: Id;
  let carolId: Id;
  const house = newId();
  const garden = newId();
  const paintFence = newId();
  const fixRoof = newId();
  const mowLawn = newId();
  let houseOps: Operation[];
  let paintFenceOps: Operation[];
  let fixRoofOps: Operation[];
  const cursors = new Map<string, number>();

  const me = async (token: string) => (await server.app.inject({ url: '/me', headers: auth(token) })).json<{ userId: Id }>();
  const push = async (token: string, ops: Operation[]) => {
    const response = await server.app.inject({ method: 'POST', url: '/sync/push', headers: auth(token), payload: { ops } });
    expect(response.statusCode).toBe(200);
    return response.json<{ results: PushResult[] }>().results.map((r) => (r.status === 'rejected' ? r.code : r.status));
  };
  /** Everything new in the user's feed since their last pull. */
  const pullNew = async (token: string) => {
    const entries: FeedEntry[] = [];
    let cursor = cursors.get(token) ?? 0;
    for (;;) {
      const response = await server.app.inject({ url: `/sync/pull?after=${String(cursor)}`, headers: auth(token) });
      expect(response.statusCode).toBe(200);
      const page = response.json<PullPage>();
      entries.push(...page.entries);
      cursor = page.cursor;
      if (!page.more) break;
    }
    cursors.set(token, cursor);
    return entries;
  };
  const invite = (token: string, target: Target, username: string, role: string) =>
    server.app.inject({ method: 'POST', url: '/invitations', headers: auth(token), payload: { target, username, role } });
  const invited = async (token: string, target: Target, username: string, role: string) => {
    const response = await invite(token, target, username, role);
    expect(response.statusCode).toBe(201);
    return response.json<{ id: Id }>().id;
  };
  const respond = (token: string, invitationId: Id, answer: 'accept' | 'decline') =>
    server.app.inject({ method: 'POST', url: `/invitations/${invitationId}/${answer}`, headers: auth(token) });
  const accept = async (token: string, invitationId: Id) => {
    expect((await respond(token, invitationId, 'accept')).statusCode).toBe(204);
  };
  const received = async (token: string) => (await server.app.inject({ url: '/invitations', headers: auth(token) })).json<unknown[]>();
  const deleteGrant = (token: string, grantId: Id) => server.app.inject({ method: 'DELETE', url: `/grants/${grantId}`, headers: auth(token) });
  const grantOf = async (userId: Id, target: Target) =>
    (
      await server.db.execute<{ id: Id }>(sql`
        select id from grants where user_id = ${userId} and target_kind = ${target.kind} and target_id = ${target.id}`)
    ).rows.map((r) => r.id);
  /** Shares House with bob as an editor; returns his grant's ID. */
  const shareHouseWithBob = async () => {
    await accept(bob, await invited(alice, { kind: 'list', id: house }, 'bob', 'editor'));
    const [grantId] = await grantOf(bobId, { kind: 'list', id: house });
    if (grantId === undefined) throw new Error('no grant');
    return grantId;
  };
  const houseForgets = () => [forget({ type: 'task', id: paintFence }), forget({ type: 'task', id: fixRoof }), forget({ type: 'list', id: house })];

  beforeAll(async () => {
    server = await testApp();
    alice = await signUp(server.app, 'alice');
    bob = await signUp(server.app, 'bob');
    carol = await signUp(server.app, 'carol');
    ({ userId: bobId } = await me(bob));
    ({ userId: carolId } = await me(carol));

    paintFenceOps = [createTask(paintFence, house), set('task', paintFence, 'title', 'Paint fence')];
    fixRoofOps = [createTask(fixRoof, house), set('task', fixRoof, 'title', 'Fix roof')];
    houseOps = [createList(house), set('list', house, 'title', 'House'), ...paintFenceOps, ...fixRoofOps];
    const gardenOps = [createList(garden), set('list', garden, 'title', 'Garden'), createTask(mowLawn, garden), set('task', mowLawn, 'title', 'Mow lawn')];
    expect(await push(alice, [...houseOps, ...gardenOps])).toEqual([...houseOps, ...gardenOps].map(() => 'accepted'));
    for (const token of [alice, bob, carol]) await pullNew(token);
  });
  afterAll(async () => {
    await server.close();
  });

  test('alice invites bob to House as an editor; once he accepts he sees House and can edit it', async () => {
    const id = await invited(alice, { kind: 'list', id: house }, 'bob', 'editor');
    expect(await received(bob)).toEqual([{ id, inviter: { username: 'alice' }, target: { kind: 'list', id: house }, role: 'editor' }]);
    expect(await received(alice)).toEqual([]);

    await accept(bob, id);
    expect(await received(bob)).toEqual([]);
    const bobOps = opsOf(await pullNew(bob));
    expect(bobOps.map((o) => o.id)).toEqual(expect.arrayContaining(houseOps.map((o) => o.id)));
    const aliceGrants = opsOf(await pullNew(alice)).filter((o) => o.meta?.kind === 'grant');
    expect(aliceGrants.map((o) => o.meta)).toEqual([{ kind: 'grant', userId: bobId, target: { kind: 'list', id: house }, role: 'editor' }]);

    expect(await push(bob, [set('task', fixRoof, 'title', 'Fix the roof')])).toEqual(['accepted']);
  });

  test("as a viewer of Garden, bob's completedAt push is forbidden", async () => {
    await accept(bob, await invited(alice, { kind: 'list', id: garden }, 'bob', 'viewer'));
    expect(await push(bob, [set('task', mowLawn, 'completedAt', '2026-11-12T10:00:00.000Z')])).toEqual(['forbidden']);
  });

  test('bob, an editor, can invite carol to Paint fence only once House lets editors share', async () => {
    expect((await invite(bob, { kind: 'task', id: paintFence }, 'carol', 'viewer')).statusCode).toBe(403);
    expect(await push(alice, [set('list', house, 'editorsCanShare', true)])).toEqual(['accepted']);
    const id = await invited(bob, { kind: 'task', id: paintFence }, 'carol', 'viewer');

    // Carol declines; the invitation is gone and nothing was granted.
    expect((await respond(carol, id, 'decline')).statusCode).toBe(204);
    expect(await received(carol)).toEqual([]);
    expect(await grantOf(carolId, { kind: 'task', id: paintFence })).toEqual([]);
  });

  test('alice shares Paint fence with carol: she sees Paint fence, not House or Fix roof, and can edit it', async () => {
    await accept(carol, await invited(alice, { kind: 'task', id: paintFence }, 'carol', 'editor'));
    const carolOps = opsOf(await pullNew(carol)).map((o) => o.id);
    expect(carolOps).toEqual(expect.arrayContaining(paintFenceOps.map((o) => o.id)));
    for (const hidden of [...houseOps.slice(0, 2), ...fixRoofOps]) expect(carolOps).not.toContain(hidden.id);
    expect(await push(carol, [set('task', paintFence, 'title', 'Paint the fence')])).toEqual(['accepted']);
  });

  test("alice removes bob from House: he forgets House and its tasks, and his later edits aren't found", async () => {
    const [grantId] = await grantOf(bobId, { kind: 'list', id: house });
    expect((await deleteGrant(alice, grantId ?? '')).statusCode).toBe(204);
    const described = (await pullNew(bob)).map(describeEntry);
    for (const expected of houseForgets()) expect(described).toContain(expected);
    expect(await push(bob, [set('task', paintFence, 'title', 'Still mine?')])).toEqual(['not-found']);
  });

  test('bob leaves House: he forgets it, and alice sees the revokeGrant', async () => {
    await pullNew(alice);
    const grantId = await shareHouseWithBob();
    await pullNew(bob);
    expect((await deleteGrant(bob, grantId)).statusCode).toBe(204);
    const described = (await pullNew(bob)).map(describeEntry);
    for (const expected of houseForgets()) expect(described).toContain(expected);
    const revokes = opsOf(await pullNew(alice)).filter((o) => o.meta?.kind === 'revokeGrant');
    expect(revokes.map((o) => o.record)).toEqual([{ type: 'grant', id: grantId }]);
    expect(await grantOf(bobId, { kind: 'list', id: house })).toEqual([]);
  });

  describe('bad requests', () => {
    const invalid = (field: string, code: string) => ({ code: 'invalid', errors: [{ field, code }] });

    test('inviting an unknown user, yourself, or as an owner is invalid', async () => {
      const target: Target = { kind: 'list', id: house };
      const unknown = await invite(alice, target, 'nosuchuser', 'editor');
      expect([unknown.statusCode, unknown.json()]).toEqual([422, invalid('username', 'invalid')]);
      const self = await invite(alice, target, 'alice', 'editor');
      expect([self.statusCode, self.json()]).toEqual([422, invalid('username', 'invalid')]);
      const owner = await invite(alice, target, 'bob', 'owner');
      expect([owner.statusCode, owner.json()]).toEqual([422, invalid('role', 'invalid')]);
    });

    test('inviting someone who already has an equal or higher role is already-shared', async () => {
      const again = await invite(alice, { kind: 'task', id: paintFence }, 'carol', 'viewer');
      expect([again.statusCode, again.json()]).toEqual([422, invalid('username', 'already-shared')]);
    });

    test("a target the caller can't see is not found", async () => {
      const response = await invite(carol, { kind: 'list', id: house }, 'bob', 'viewer');
      expect([response.statusCode, response.json()]).toEqual([404, { code: 'not-found' }]);
      expect((await invite(carol, { kind: 'task', id: newId() }, 'bob', 'viewer')).statusCode).toBe(404);
    });

    test("someone else's invitation can't be accepted or declined", async () => {
      const id = await invited(alice, { kind: 'list', id: house }, 'bob', 'viewer');
      expect((await respond(carol, id, 'accept')).statusCode).toBe(404);
      expect((await respond(carol, id, 'decline')).statusCode).toBe(404);
      expect((await respond(alice, id, 'accept')).statusCode).toBe(404);
      expect((await respond(bob, id, 'decline')).statusCode).toBe(204);
      expect((await respond(bob, id, 'accept')).statusCode).toBe(404);
    });

    test("a third user deleting bob's grant gets not found", async () => {
      const [gardenGrant] = await grantOf(bobId, { kind: 'list', id: garden });
      expect((await deleteGrant(carol, gardenGrant ?? '')).statusCode).toBe(404);
      expect(await grantOf(bobId, { kind: 'list', id: garden })).toEqual([gardenGrant]);
      expect((await deleteGrant(carol, newId())).statusCode).toBe(404);
    });

    test("an invitation from someone who can no longer share can't be accepted", async () => {
      const grantId = await shareHouseWithBob();
      const id = await invited(bob, { kind: 'task', id: fixRoof }, 'carol', 'viewer');
      expect(await push(alice, [set('list', house, 'editorsCanShare', false)])).toEqual(['accepted']);
      expect((await respond(carol, id, 'accept')).statusCode).toBe(404);
      expect(await grantOf(carolId, { kind: 'task', id: fixRoof })).toEqual([]);
      expect((await deleteGrant(alice, grantId)).statusCode).toBe(204);
    });
  });
});
