import { buildGraph, postrequisitesOf, prerequisitesOf, redundantLinkIds, type Id } from '@tdl/domain';
import type { Replica } from '@tdl/sync';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ok, settle, startServer, type TestServer, type User } from './harness.ts';

const graphOf = (replica: Replica) => buildGraph(replica.state().tasks.values(), replica.state().links.values());

describe('Link tasks', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  /** A user with two devices and the named tasks in their Inbox, synced to both. */
  async function setUp(...titles: string[]): Promise<{ user: User; phone: Replica; laptop: Replica; ids: Id[] }> {
    const user = await server.signUp('alice');
    const phone = await server.device(user);
    const laptop = await server.device(user);
    const ids: Id[] = [];
    for (const title of titles) ids.push(ok(await phone.createTask(user.defaultListId, title)));
    await settle(phone, laptop);
    return { user, phone, laptop, ids };
  }

  async function addLink(replica: Replica, prerequisiteId: Id, postrequisiteId: Id): Promise<Id> {
    const result = await replica.addLink(prerequisiteId, postrequisiteId);
    if (!result.ok) expect.fail(`link rejected: ${JSON.stringify(result.rejection)}`);
    return result.id;
  }

  /** "A" before "B" before "C", with "B" completed if asked. */
  async function chainOfThree({ completeB }: { completeB: boolean }) {
    const setup = await setUp('A', 'B', 'C');
    const [a, b, c] = setup.ids as [Id, Id, Id];
    await addLink(setup.phone, a, b);
    await addLink(setup.phone, b, c);
    if (completeB) ok(await setup.phone.setTaskField(b, 'completedAt', new Date().toISOString()));
    await settle(setup.phone, setup.laptop);
    return { ...setup, a, b, c };
  }

  test('Add a prerequisite', async () => {
    // Given tasks "Buy paint" and "Paint fence"
    const { phone, laptop, ids } = await setUp('Buy paint', 'Paint fence');
    const [buyPaint, paintFence] = ids as [Id, Id];

    // When the user makes "Buy paint" a prerequisite of "Paint fence"
    const link = await addLink(phone, buyPaint, paintFence);
    await settle(phone, laptop);

    // Then "Buy paint" is listed as a prerequisite of "Paint fence"
    // And "Paint fence" is listed as a postrequisite of "Buy paint"
    const g = graphOf(laptop);
    expect(prerequisitesOf(g, paintFence)).toMatchObject([{ id: link, prerequisiteId: buyPaint }]);
    expect(postrequisitesOf(g, buyPaint)).toMatchObject([{ id: link, postrequisiteId: paintFence }]);
  });

  test('Reject a cycle', async () => {
    // Given "A" is a prerequisite of "B" and "B" is a prerequisite of "C"
    const { laptop, a, c } = await chainOfThree({ completeB: false });

    // When the user makes "C" a prerequisite of "A"
    const result = await laptop.addLink(c, a);

    // Then the link is rejected with a message explaining it would create a cycle
    expect(result).toEqual({ ok: false, rejection: { code: 'cycle', prerequisiteId: c, postrequisiteId: a } });
    expect(laptop.pending()).toEqual([]);
  });

  test('Reject a redundant link', async () => {
    // Given "A" is a prerequisite of "B" and "B" is a prerequisite of "C", all incomplete
    const { laptop, a, c } = await chainOfThree({ completeB: false });

    // When the user makes "A" a prerequisite of "C"
    const result = await laptop.addLink(a, c);

    // Then the link is rejected with a message explaining "A" already comes before "C"
    expect(result).toEqual({ ok: false, rejection: { code: 'redundant', prerequisiteId: a, postrequisiteId: c } });
  });

  test('Cycles through completed tasks are still rejected', async () => {
    // Given "A" before "B" before "C", and "B" is completed
    const { laptop, a, c } = await chainOfThree({ completeB: true });

    // When the user makes "C" a prerequisite of "A"
    const result = await laptop.addLink(c, a);

    // Then the link is rejected with a message explaining it would create a cycle
    expect(result).toEqual({ ok: false, rejection: { code: 'cycle', prerequisiteId: c, postrequisiteId: a } });
  });

  test("Completed tasks don't make links redundant", async () => {
    // Given "A" before "B" before "C", and "B" is completed
    const { phone, laptop, a, c } = await chainOfThree({ completeB: true });

    // When the user makes "A" a prerequisite of "C"
    const link = await addLink(laptop, a, c);
    await settle(phone, laptop);

    // Then the link is added
    expect(phone.state().links.get(link)).toMatchObject({ prerequisiteId: a, postrequisiteId: c });
  });

  test('Remove a link', async () => {
    // Given "A" is a prerequisite of "B"
    const { phone, laptop, ids } = await setUp('A', 'B');
    const [a, b] = ids as [Id, Id];
    const link = await addLink(phone, a, b);
    await settle(phone, laptop);

    // When the user removes that link
    ok(await laptop.removeLink(link));
    await settle(phone, laptop);

    // Then neither task lists the other
    const g = graphOf(phone);
    expect(postrequisitesOf(g, a)).toEqual([]);
    expect(prerequisitesOf(g, b)).toEqual([]);
  });

  test('Existing link that becomes redundant is kept', async () => {
    // Given "A" is a prerequisite of "C"
    const { phone, laptop, ids } = await setUp('A', 'B', 'C');
    const [a, b, c] = ids as [Id, Id, Id];
    const aBeforeC = await addLink(phone, a, c);
    await settle(phone, laptop);

    // When the user makes "A" a prerequisite of "B" and "B" a prerequisite of "C"
    await addLink(laptop, a, b);
    await addLink(laptop, b, c);
    await settle(phone, laptop);

    // Then "A" is still a prerequisite of "C"
    // And that link is shown as redundant
    for (const replica of [phone, laptop]) {
      expect(replica.state().links.get(aBeforeC)).toMatchObject({ prerequisiteId: a, postrequisiteId: c });
      expect([...redundantLinkIds(graphOf(replica))]).toEqual([aBeforeC]);
    }
  });

  test("Can't link a task to itself", async () => {
    // Given a task "A"
    const { phone, ids } = await setUp('A');
    const [a] = ids as [Id];

    // When the user searches for a prerequisite to add to "A"
    const result = await phone.addLink(a, a);

    // Then "A" is shown but can't be chosen, with the reason that a task can't be linked to itself
    expect(result).toEqual({ ok: false, rejection: { code: 'self' } });
  });

  test('Link already exists', async () => {
    // Given "A" is a prerequisite of "B"
    const { phone, laptop, ids } = await setUp('A', 'B');
    const [a, b] = ids as [Id, Id];
    await addLink(phone, a, b);
    await settle(phone, laptop);

    // When the user searches for a prerequisite to add to "B"
    const result = await laptop.addLink(a, b);

    // Then "A" is shown but can't be chosen, with the reason that it is already linked
    expect(result).toEqual({ ok: false, rejection: { code: 'exists' } });
  });

  test('Both tasks must be editable', async () => {
    // Given "bob" is a viewer of alice's shared list "House", which contains "Paint fence"
    const alice = await server.signUp('alice');
    const bob = await server.signUp('bob');
    const alicePhone = await server.device(alice);
    const house = ok(await alicePhone.createList('House'));
    const paintFence = ok(await alicePhone.createTask(house, 'Paint fence'));
    await settle(alicePhone);
    await server.share(alice, { kind: 'list', id: house }, bob, 'viewer');
    const bobPhone = await server.device(bob);
    const buyPaint = ok(await bobPhone.createTask(bob.defaultListId, 'Buy paint'));
    await settle(bobPhone);

    // When he tries to make his own task "Buy paint" a prerequisite of "Paint fence", or "Paint fence" a prerequisite of "Buy paint"
    const before = await bobPhone.addLink(buyPaint, paintFence);
    const after = await bobPhone.addLink(paintFence, buyPaint);

    // Then the link is rejected with a message explaining he can't edit "Paint fence"
    const rejection = { code: 'not-editable', taskId: paintFence };
    expect(before).toEqual({ ok: false, rejection });
    expect(after).toEqual({ ok: false, rejection });
    expect(bobPhone.pending()).toEqual([]);
  });
});
