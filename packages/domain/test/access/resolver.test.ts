import { describe, expect, test } from 'vitest';
import { can, canMoveTask, listRole, taskAccess, visibleTaskIds, type AccessData } from '../../src/access/resolver.ts';
import type { Grant, List } from '../../src/model.ts';

function list(id: string, ownerId: string, editorsCanShare = false): List {
  return { id, ownerId, title: id, editorsCanShare };
}

function data(grants: Grant[], extraLists: List[] = []): AccessData {
  const lists = [list('House', 'alice'), list('Garden', 'alice'), list("Bob's", 'bob'), ...extraLists];
  return {
    lists: new Map(lists.map((l) => [l.id, l])),
    tasks: new Map([
      ['Paint fence', { id: 'Paint fence', listId: 'House' }],
      ['Fix roof', { id: 'Fix roof', listId: 'House' }],
      ['Buy paint', { id: 'Buy paint', listId: "Bob's" }],
    ]),
    grants,
  };
}

const onList = (userId: string, id: string, role: Grant['role']): Grant => ({
  userId,
  target: { kind: 'list', id },
  role,
});
const onTask = (userId: string, id: string, role: Grant['role']): Grant => ({
  userId,
  target: { kind: 'task', id },
  role,
});

describe('grant resolver', () => {
  test('the owner of a list has the owner role', () => {
    expect(listRole(data([]), 'alice', 'House')).toBe('owner');
    expect(listRole(data([]), 'bob', 'House')).toBeNull();
  });

  test('an editor of a shared list can edit its tasks', () => {
    expect(can(data([onList('bob', 'House', 'editor')]), 'bob', 'edit', 'Paint fence')).toBe(true);
  });

  test("a viewer can't edit", () => {
    expect(can(data([onList('bob', 'House', 'viewer')]), 'bob', 'edit', 'Paint fence')).toBe(false);
    expect(can(data([onList('bob', 'House', 'viewer')]), 'bob', 'view', 'Paint fence')).toBe(true);
  });

  test('the highest of several list grants counts', () => {
    const d = data([onList('bob', 'House', 'viewer'), onList('bob', 'House', 'editor')]);
    expect(listRole(d, 'bob', 'House')).toBe('editor');
  });

  test('a task shared on its own is the only one visible from its list', () => {
    const d = data([onTask('bob', 'Paint fence', 'editor')]);
    expect(visibleTaskIds(d, 'bob')).toEqual(new Set(['Paint fence', 'Buy paint']));
    expect(can(d, 'bob', 'edit', 'Paint fence')).toBe(true);
    expect(taskAccess(d, 'bob', 'Paint fence')).toEqual({ role: 'editor', via: 'task' });
  });

  test('grants only add access', () => {
    const d = data([onList('bob', 'House', 'editor'), onTask('bob', 'Paint fence', 'viewer')]);
    expect(taskAccess(d, 'bob', 'Paint fence')).toEqual({ role: 'editor', via: 'list' });
  });

  test('a task grant higher than the list grant wins', () => {
    const d = data([onList('bob', 'House', 'viewer'), onTask('bob', 'Paint fence', 'editor')]);
    expect(taskAccess(d, 'bob', 'Paint fence')).toEqual({ role: 'editor', via: 'task' });
  });

  test('on a tie, access is through the list', () => {
    const d = data([onList('bob', 'House', 'editor'), onTask('bob', 'Paint fence', 'editor')]);
    expect(taskAccess(d, 'bob', 'Paint fence')).toEqual({ role: 'editor', via: 'list' });
  });

  test('removing a grant removes access', () => {
    const before = data([onList('bob', 'House', 'editor')]);
    expect(visibleTaskIds(before, 'bob')).toEqual(new Set(['Paint fence', 'Fix roof', 'Buy paint']));
    const after = data([]);
    expect(visibleTaskIds(after, 'carol')).toEqual(new Set());
    expect(visibleTaskIds(after, 'bob')).toEqual(new Set(['Buy paint']));
  });

  test("an editor through a task grant can't delete the task", () => {
    expect(can(data([onTask('bob', 'Paint fence', 'editor')]), 'bob', 'deleteTask', 'Paint fence')).toBe(false);
    expect(can(data([onList('bob', 'House', 'editor')]), 'bob', 'deleteTask', 'Paint fence')).toBe(true);
  });
});

describe('canMoveTask', () => {
  test("an editor can't move a task to a list with a different owner", () => {
    expect(canMoveTask(data([onList('bob', 'House', 'editor')]), 'bob', 'Paint fence', "Bob's")).toBe(false);
  });

  test("the owner can move a task between their own lists", () => {
    expect(canMoveTask(data([]), 'alice', 'Paint fence', 'Garden')).toBe(true);
  });

  test('an editor can move a task between lists with the same owner they edit', () => {
    const d = data([onList('bob', 'House', 'editor'), onList('bob', 'Garden', 'editor')]);
    expect(canMoveTask(d, 'bob', 'Paint fence', 'Garden')).toBe(true);
  });

  test('the destination list needs edit access too', () => {
    const d = data([onList('bob', 'House', 'editor'), onList('bob', 'Garden', 'viewer')]);
    expect(canMoveTask(d, 'bob', 'Paint fence', 'Garden')).toBe(false);
  });

  test("a task grant doesn't allow moving", () => {
    const d = data([onTask('bob', 'Paint fence', 'editor'), onList('bob', 'Garden', 'editor')]);
    expect(canMoveTask(d, 'bob', 'Paint fence', 'Garden')).toBe(false);
  });

  test('the owner can move their task to a list they edit with a different owner', () => {
    const d = data([onList('alice', "Bob's", 'editor')]);
    expect(canMoveTask(d, 'alice', 'Paint fence', "Bob's")).toBe(true);
  });
});

describe('stale access data', () => {
  test('a grant on a missing list gives no access', () => {
    expect(listRole(data([onList('bob', 'Gone', 'editor')]), 'bob', 'Gone')).toBeNull();
  });

  test('a task whose list is missing gives no access through the list', () => {
    const d: AccessData = { ...data([]), tasks: new Map([['Orphan', { id: 'Orphan', listId: 'Gone' }]]) };
    expect(taskAccess(d, 'alice', 'Orphan')).toBeNull();
    expect(can(d, 'alice', 'view', 'Orphan')).toBe(false);
    expect(visibleTaskIds(d, 'alice')).toEqual(new Set());
  });

  test('an unknown task gives no access', () => {
    const d = data([onTask('bob', 'Gone', 'editor')]);
    expect(taskAccess(d, 'bob', 'Gone')).toBeNull();
    expect(can(d, 'bob', 'edit', 'Gone')).toBe(false);
    expect(canMoveTask(d, 'bob', 'Gone', 'House')).toBe(false);
  });

  test('moving to a missing list is refused', () => {
    expect(canMoveTask(data([]), 'alice', 'Paint fence', 'Gone')).toBe(false);
  });
});
