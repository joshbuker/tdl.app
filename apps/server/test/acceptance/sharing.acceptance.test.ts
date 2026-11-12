import { buildGraph, findLoops, type Id } from '@tdl/domain';
import type { Replica } from '@tdl/sync';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { nextUp, ok, settle, startServer, titles, type TestServer, type User } from './harness.ts';

const graphOf = (replica: Replica) => buildGraph(replica.state().tasks.values(), replica.state().links.values());
const now = () => new Date().toISOString();

describe('Sharing', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  /** "alice" with a device, and her list `title` holding the tasks `taskTitles`, synced. */
  async function aliceWithList(title: string, ...taskTitles: string[]) {
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const list = ok(await alicePhone.createList(title));
    const tasks: Id[] = [];
    for (const taskTitle of taskTitles) tasks.push(ok(await alicePhone.createTask(list, taskTitle)));
    await settle(alicePhone);
    return { alice, bob, alicePhone, list, tasks };
  }

  /** As `aliceWithList`, with the list shared with "bob" in `role`, and his device synced. */
  async function sharedWithBob(role: 'editor' | 'viewer', title: string, ...taskTitles: string[]) {
    const setup = await aliceWithList(title, ...taskTitles);
    await server.share(setup.alice, { kind: 'list', id: setup.list }, setup.bob, role);
    const bobPhone = await server.device(setup.bob);
    await settle(setup.alicePhone, bobPhone);
    return { ...setup, bobPhone };
  }

  /** The ID of the grant giving `user` access, as the replica sees it. */
  function grantOf(replica: Replica, user: User): Id {
    const grant = [...replica.state().grants.values()].find((g) => g.userId === user.userId);
    if (grant === undefined) expect.fail('no grant');
    return grant.id;
  }

  const listTitles = (replica: Replica) => [...replica.state().lists.values()].map((l) => l.title).sort();

  test('Share a list', async () => {
    // Given "alice" owns the list "House"
    const { alice, bob, alicePhone, list, tasks } = await aliceWithList('House', 'Paint fence');
    const [paintFence] = tasks as [Id];

    // When she shares it with "bob" as an editor
    await server.share(alice, { kind: 'list', id: list }, bob, 'editor');

    // Then "bob" sees "House" and its tasks, and can edit them
    const bobPhone = await server.device(bob);
    expect(listTitles(bobPhone)).toEqual(['House', 'Inbox']);
    expect(titles(bobPhone)).toEqual(['Paint fence']);
    ok(await bobPhone.setTaskField(paintFence, 'title', 'Paint the fence'));
    await settle(bobPhone, alicePhone);
    expect(bobPhone.rejected()).toEqual([]);
    expect(titles(alicePhone)).toEqual(['Paint the fence']);
  });

  test('Share a single task', async () => {
    // Given "alice" owns the list "House" with the tasks "Paint fence" and "Fix roof"
    const { alice, bob, alicePhone, tasks } = await aliceWithList('House', 'Paint fence', 'Fix roof');
    const [paintFence] = tasks as [Id, Id];

    // When she shares "Paint fence" with "bob" as an editor
    await server.share(alice, { kind: 'task', id: paintFence }, bob, 'editor');

    // Then "bob" sees "Paint fence" in "Shared with me", and can edit and complete it
    // And he doesn't see "House" or "Fix roof"
    const bobPhone = await server.device(bob);
    expect(titles(bobPhone)).toEqual(['Paint fence']);
    expect(listTitles(bobPhone)).toEqual(['Inbox']);
    ok(await bobPhone.setTaskField(paintFence, 'title', 'Paint the fence'));
    ok(await bobPhone.setTaskField(paintFence, 'completedAt', now()));
    await settle(bobPhone, alicePhone);
    expect(bobPhone.rejected()).toEqual([]);
    expect(alicePhone.state().tasks.get(paintFence)).toMatchObject({ title: 'Paint the fence', completedAt: expect.any(String) as string });
  });

  test("Viewer can't edit", async () => {
    // Given "bob" is a viewer of "House"
    const { bob, bobPhone, tasks } = await sharedWithBob('viewer', 'House', 'Paint fence');
    const [paintFence] = tasks as [Id];

    // When he tries to complete a task in "House"
    const result = await bobPhone.setTaskField(paintFence, 'completedAt', now());

    // Then he can't
    expect(result).toEqual({ ok: false, errors: [{ field: 'taskId', code: 'forbidden' }] });
    expect(bobPhone.pending()).toEqual([]);
    expect(await server.pushEdit(bob, paintFence, 'completedAt', now())).toMatchObject({ status: 'rejected', code: 'forbidden' });
  });

  test('Leave a shared list', async () => {
    // Given "bob" is an editor of "House"
    const { bob, alicePhone, bobPhone } = await sharedWithBob('editor', 'House', 'Paint fence');
    const grant = grantOf(bobPhone, bob);
    expect(alicePhone.state().grants.has(grant)).toBe(true);

    // When he leaves "House"
    expect((await server.request('DELETE', `/grants/${grant}`, { token: bob.token })).status).toBe(204);
    await settle(alicePhone, bobPhone);

    // Then he no longer sees "House" or its tasks
    expect(listTitles(bobPhone)).toEqual(['Inbox']);
    expect(titles(bobPhone)).toEqual([]);

    // And "alice" sees that he left
    expect(alicePhone.state().grants.has(grant)).toBe(false);
    expect(titles(alicePhone)).toEqual(['Paint fence']);
  });

  test('Hidden blocker', async () => {
    // Given "Paint fence" is in the shared list "House"
    const { alice, alicePhone, bobPhone, tasks } = await sharedWithBob('editor', 'House', 'Paint fence');
    const [paintFence] = tasks as [Id];

    // And "alice" makes her private task "Get paid" a prerequisite of "Paint fence"
    const getPaid = ok(await alicePhone.createTask(alice.defaultListId, 'Get paid'));
    expect((await alicePhone.addLink(getPaid, paintFence)).ok).toBe(true);
    await settle(alicePhone, bobPhone);

    // And "bob" has no access to "Get paid"
    // Then "bob" doesn't see "Get paid", and "Paint fence" is next up for him
    expect(titles(bobPhone)).toEqual(['Paint fence']);
    expect(nextUp(bobPhone)).toEqual(['Paint fence']);
    expect(nextUp(alicePhone)).toEqual(['Get paid']);
  });

  test('Loop only another user can see', async () => {
    // Given in the shared list "Kitchen remodel", "bob" linked "Finalize budget" before his private task "Scope the job", and "Scope the job" before "Send estimate"
    const { bob, alicePhone, bobPhone, tasks } = await sharedWithBob('editor', 'Kitchen remodel', 'Finalize budget', 'Send estimate');
    const [finalizeBudget, sendEstimate] = tasks as [Id, Id];
    const scopeTheJob = ok(await bobPhone.createTask(bob.defaultListId, 'Scope the job'));
    expect((await bobPhone.addLink(finalizeBudget, scopeTheJob)).ok).toBe(true);
    expect((await bobPhone.addLink(scopeTheJob, sendEstimate)).ok).toBe(true);
    await settle(bobPhone, alicePhone);

    // And "alice" can't see "Scope the job"
    expect(titles(alicePhone)).toEqual(['Finalize budget', 'Send estimate']);

    // When "alice" makes "Send estimate" a prerequisite of "Finalize budget"
    const link = await alicePhone.addLink(sendEstimate, finalizeBudget);
    await settle(alicePhone, bobPhone);

    // Then the link is added, and "alice" sees no loop
    expect(link.ok).toBe(true);
    expect(alicePhone.rejected()).toEqual([]);
    expect(findLoops(graphOf(alicePhone))).toEqual([]);

    // And "bob" sees the loop flagged, naming its three links
    const loops = findLoops(graphOf(bobPhone));
    expect(loops).toHaveLength(1);
    expect(loops[0]?.linkIds).toHaveLength(3);
    expect(loops[0]?.taskIds).toEqual([finalizeBudget, scopeTheJob, sendEstimate].sort());
  });

  test('Remove a collaborator', async () => {
    // Given "bob" is an editor of "House"
    const { alice, bob, alicePhone, bobPhone, tasks } = await sharedWithBob('editor', 'House', 'Paint fence');
    const [paintFence] = tasks as [Id];

    // When "alice" removes him from "House"
    expect((await server.request('DELETE', `/grants/${grantOf(alicePhone, bob)}`, { token: alice.token })).status).toBe(204);
    await settle(alicePhone, bobPhone);

    // Then he no longer sees "House" or its tasks
    expect(listTitles(bobPhone)).toEqual(['Inbox']);
    expect(titles(bobPhone)).toEqual([]);

    // And edits he makes to its tasks afterwards are refused
    expect(await bobPhone.setTaskField(paintFence, 'title', 'Paint the fence')).toEqual({ ok: false, errors: [{ field: 'taskId', code: 'forbidden' }] });
    expect(await server.pushEdit(bob, paintFence, 'title', 'Paint the fence')).toMatchObject({ status: 'rejected', code: 'not-found' });
    await settle(alicePhone);
    expect(titles(alicePhone)).toEqual(['Paint fence']);
  });
});
