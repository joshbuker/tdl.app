import { describe, expect, test } from 'vitest';
import type { AccessData } from '../../src/access/resolver.ts';
import { alreadyShared, mayRemoveGrant, mayShare, roleOn } from '../../src/access/sharing.ts';
import type { Grant, List } from '../../src/model.ts';

function list(id: string, ownerId: string, editorsCanShare = false): List {
  return { id, ownerId, title: id, editorsCanShare };
}

function data(grants: Grant[], lists: List[] = [list('House', 'alice')]): AccessData {
  return {
    lists: new Map(lists.map((l) => [l.id, l])),
    tasks: new Map([['Paint fence', { id: 'Paint fence', listId: 'House' }]]),
    grants,
  };
}

const onList = (userId: string, role: Grant['role']): Grant => ({ id: `g-${userId}`, userId, target: { kind: 'list', id: 'House' }, role });
const onTask = (userId: string, role: Grant['role']): Grant => ({ id: `t-${userId}`, userId, target: { kind: 'task', id: 'Paint fence' }, role });
const house = { kind: 'list', id: 'House' } as const;
const paintFence = { kind: 'task', id: 'Paint fence' } as const;

describe('sharing rules', () => {
  test('the role on a list or a task, or null without access', () => {
    const d = data([onList('bob', 'viewer'), onTask('carol', 'editor')]);
    expect(roleOn(d, 'alice', house)).toBe('owner');
    expect(roleOn(d, 'bob', paintFence)).toBe('viewer');
    expect(roleOn(d, 'carol', house)).toBeNull();
    expect(roleOn(d, 'carol', paintFence)).toBe('editor');
  });

  test('only the owner shares a list', () => {
    const d = data([onList('bob', 'editor')], [list('House', 'alice', true)]);
    expect(mayShare(d, 'alice', house)).toBe(true);
    expect(mayShare(d, 'bob', house)).toBe(false);
    expect(mayShare(d, 'carol', house)).toBe(false);
  });

  test('an editor of the list shares a task only if the owner allows it', () => {
    expect(mayShare(data([onList('bob', 'editor')]), 'bob', paintFence)).toBe(false);
    expect(mayShare(data([onList('bob', 'editor')], [list('House', 'alice', true)]), 'bob', paintFence)).toBe(true);
    expect(mayShare(data([onTask('bob', 'editor')], [list('House', 'alice', true)]), 'bob', paintFence)).toBe(false);
    expect(mayShare(data([]), 'alice', paintFence)).toBe(true);
  });

  test('a grant is removed by its grantee or by the owner', () => {
    const d = data([onList('bob', 'viewer'), onList('carol', 'editor')]);
    const bobs = { userId: 'bob', target: house };
    expect(mayRemoveGrant(d, 'bob', bobs)).toBe(true);
    expect(mayRemoveGrant(d, 'alice', bobs)).toBe(true);
    expect(mayRemoveGrant(d, 'carol', bobs)).toBe(false);
  });

  test('already shared when the user has the role or higher', () => {
    const d = data([onList('bob', 'editor')]);
    expect(alreadyShared(d, 'bob', house, 'viewer')).toBe(true);
    expect(alreadyShared(d, 'bob', house, 'editor')).toBe(true);
    expect(alreadyShared(d, 'carol', house, 'viewer')).toBe(false);
    expect(alreadyShared(data([onList('bob', 'viewer')]), 'bob', house, 'editor')).toBe(false);
  });
});
