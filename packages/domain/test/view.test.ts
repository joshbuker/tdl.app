import { describe, expect, test } from 'vitest';
import type { AccessData } from '../src/access/resolver.ts';
import { findLoops } from '../src/graph/analysis.ts';
import type { Grant, Link, List, Task } from '../src/model.ts';
import { nextUpTaskIds } from '../src/next-up.ts';
import { checkNewLinkFor, userGraph } from '../src/view.ts';
import { link, task } from './fixtures.ts';

function list(id: string, ownerId: string): List {
  return { id, ownerId, title: id, editorsCanShare: false };
}

function world(tasks: Task[], lists: List[], grants: Grant[]): AccessData {
  return {
    lists: new Map(lists.map((l) => [l.id, l])),
    tasks: new Map(tasks.map((t) => [t.id, { id: t.id, listId: t.listId }])),
    grants,
  };
}

const house = list('House', 'alice');
const alices = list("Alice's", 'alice');
const bobs = list("Bob's", 'bob');
const bobOnHouse = (role: Grant['role']): Grant => ({ id: 'g-bob-house', userId: 'bob', target: { kind: 'list', id: 'House' }, role });

describe('userGraph and checkNewLinkFor', () => {
  test('a prerequisite hidden from a user does not block for them', () => {
    const tasks = [task('Paint fence', { listId: 'House' }), task('Get paid', { listId: "Alice's" })];
    const links = [link('Get paid', 'Paint fence')];
    const data = world(tasks, [house, alices], [bobOnHouse('editor')]);

    const forBob = nextUpTaskIds(userGraph(data, tasks, links, 'bob'));
    expect(forBob.has('Paint fence')).toBe(true);
    expect(forBob.has('Get paid')).toBe(false);
    expect(nextUpTaskIds(userGraph(data, tasks, links, 'alice')).has('Paint fence')).toBe(false);
  });

  test('links to tasks a user can not see are dropped from their graph', () => {
    const tasks = [task('Paint fence', { listId: 'House' }), task('Get paid', { listId: "Alice's" })];
    const links = [link('Get paid', 'Paint fence')];
    const data = world(tasks, [house, alices], [bobOnHouse('editor')]);

    const g = userGraph(data, tasks, links, 'bob');
    expect([...g.tasks.keys()]).toEqual(['Paint fence']);
    const touching = [...g.links.values()].filter(
      (l) => l.prerequisiteId === 'Get paid' || l.postrequisiteId === 'Get paid',
    );
    expect(touching).toEqual([]);
  });

  test('a loop only another user can see is allowed, and flagged only for them', () => {
    const kitchen = list('Kitchen remodel', 'alice');
    const tasks = [
      task('Finalize budget', { listId: 'Kitchen remodel' }),
      task('Send estimate', { listId: 'Kitchen remodel' }),
      task('Scope the job', { listId: "Bob's" }),
    ];
    const data = world(tasks, [kitchen, bobs], [
      { id: 'g-bob-kitchen', userId: 'bob', target: { kind: 'list', id: 'Kitchen remodel' }, role: 'editor' },
    ]);
    const links: Link[] = [link('Finalize budget', 'Scope the job'), link('Scope the job', 'Send estimate')];

    expect(checkNewLinkFor(data, tasks, links, 'alice', 'Send estimate', 'Finalize budget')).toEqual({ ok: true });

    const after = [...links, link('Send estimate', 'Finalize budget')];
    const bobLoops = findLoops(userGraph(data, tasks, after, 'bob'));
    expect(bobLoops).toHaveLength(1);
    expect(bobLoops[0]?.linkIds).toHaveLength(3);
    expect(findLoops(userGraph(data, tasks, after, 'alice'))).toEqual([]);
  });

  test('Private prerequisite on a shared task', () => {
    const tasks = [task('Paint fence', { listId: 'House' }), task('Buy paint', { listId: "Bob's" })];
    const data = world(tasks, [house, bobs], [bobOnHouse('editor')]);

    expect(checkNewLinkFor(data, tasks, [], 'bob', 'Buy paint', 'Paint fence')).toEqual({ ok: true });

    const links = [link('Buy paint', 'Paint fence')];
    expect(nextUpTaskIds(userGraph(data, tasks, links, 'bob')).has('Paint fence')).toBe(false);
    const forAlice = userGraph(data, tasks, links, 'alice');
    expect(forAlice.tasks.has('Buy paint')).toBe(false);
    expect(nextUpTaskIds(forAlice).has('Paint fence')).toBe(true);
  });

  test('Both tasks must be editable', () => {
    const tasks = [task('Paint fence', { listId: 'House' }), task('Buy paint', { listId: "Bob's" })];
    const data = world(tasks, [house, bobs], [bobOnHouse('viewer')]);
    const rejection = { code: 'not-editable', taskId: 'Paint fence' };

    expect(checkNewLinkFor(data, tasks, [], 'bob', 'Buy paint', 'Paint fence')).toEqual({ ok: false, rejection });
    expect(checkNewLinkFor(data, tasks, [], 'bob', 'Paint fence', 'Buy paint')).toEqual({ ok: false, rejection });
  });

  test('a task the user can not see is refused as not editable, naming only the given ID', () => {
    const tasks = [task('Get paid', { listId: "Alice's" }), task('Buy paint', { listId: "Bob's" })];
    const data = world(tasks, [alices, bobs], []);
    expect(checkNewLinkFor(data, tasks, [], 'bob', 'Buy paint', 'Get paid')).toEqual({
      ok: false,
      rejection: { code: 'not-editable', taskId: 'Get paid' },
    });
  });
});
