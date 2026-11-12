import { describe, expect, test } from 'vitest';
import { audienceOf, visibilityChange, visibleRecords } from '../../src/access/visibility.ts';
import type { AccessData } from '../../src/access/resolver.ts';
import type { Grant, List } from '../../src/model.ts';

const house: List = { id: 'House', ownerId: 'alice', title: 'House', editorsCanShare: false };
const grants: Grant[] = [
  { id: 'g1', userId: 'bob', target: { kind: 'list', id: 'House' }, role: 'editor' },
  { id: 'g2', userId: 'carol', target: { kind: 'task', id: 'Paint fence' }, role: 'viewer' },
];
const data: AccessData = {
  lists: new Map([['House', house]]),
  tasks: new Map([
    ['Paint fence', { id: 'Paint fence', listId: 'House' }],
    ['Fix roof', { id: 'Fix roof', listId: 'House' }],
  ]),
  grants,
};
const links = [{ id: 'l1', prerequisiteId: 'Paint fence', postrequisiteId: 'Fix roof' }];

describe('visibleRecords', () => {
  test('a task grantee sees only the task and their own grant', () => {
    const v = visibleRecords(data, links, 'carol');
    expect(v.tasks).toEqual(new Set(['Paint fence']));
    expect(v.links).toEqual(new Set());
    expect(v.lists).toEqual(new Set());
    expect(v.grants).toEqual(new Set(['g2']));
  });

  test('the owner sees everything, including all grants on their list and its tasks', () => {
    const v = visibleRecords(data, links, 'alice');
    expect(v.lists).toEqual(new Set(['House']));
    expect(v.tasks).toEqual(new Set(['Paint fence', 'Fix roof']));
    expect(v.links).toEqual(new Set(['l1']));
    expect(v.grants).toEqual(new Set(['g1', 'g2']));
  });

  test('a list grantee sees the list, tasks, links and only their own grant', () => {
    const v = visibleRecords(data, links, 'bob');
    expect(v.lists).toEqual(new Set(['House']));
    expect(v.links).toEqual(new Set(['l1']));
    expect(v.grants).toEqual(new Set(['g1']));
  });
});

describe('audienceOf', () => {
  test('a task', () => {
    expect(audienceOf(data, links, { type: 'task', id: 'Fix roof' })).toEqual(new Set(['alice', 'bob']));
  });
  test('a link', () => {
    expect(audienceOf(data, links, { type: 'link', id: 'l1' })).toEqual(new Set(['alice', 'bob']));
  });
  test('a grant', () => {
    expect(audienceOf(data, links, { type: 'grant', id: 'g2' })).toEqual(new Set(['alice', 'carol']));
  });
  test('a list', () => {
    expect(audienceOf(data, links, { type: 'list', id: 'House' })).toEqual(new Set(['alice', 'bob']));
  });
});

describe('visibilityChange', () => {
  const garden: List = { id: 'Garden', ownerId: 'alice', title: 'Garden', editorsCanShare: false };
  const twoLinks = [...links, { id: 'l0', prerequisiteId: 'Fix roof', postrequisiteId: 'Paint fence' }];
  const withoutBob: AccessData = { ...data, grants: grants.filter((g) => g.id !== 'g1') };

  test('losing a list grant forgets grants and links, then tasks by id, then the list', () => {
    expect(visibilityChange(data, withoutBob, twoLinks, 'bob')).toEqual({
      gained: [],
      lost: [
        { type: 'grant', id: 'g1' },
        { type: 'link', id: 'l0' },
        { type: 'link', id: 'l1' },
        { type: 'task', id: 'Fix roof' },
        { type: 'task', id: 'Paint fence' },
        { type: 'list', id: 'House' },
      ],
    });
  });

  test('gaining a list grant gains everything the grant reveals', () => {
    const { gained, lost } = visibilityChange(withoutBob, data, twoLinks, 'bob');
    expect(lost).toEqual([]);
    expect(new Set(gained.map((r) => `${r.type} ${r.id}`))).toEqual(
      new Set(['grant g1', 'link l0', 'link l1', 'task Fix roof', 'task Paint fence', 'list House']),
    );
  });

  test('a task moved to a private list is lost with its links, and the list stays', () => {
    const moved: AccessData = {
      ...data,
      lists: new Map([...data.lists, ['Garden', garden]]),
      tasks: new Map([...data.tasks, ['Paint fence', { id: 'Paint fence', listId: 'Garden' }]]),
    };
    expect(visibilityChange(data, moved, links, 'bob')).toEqual({
      gained: [],
      lost: [
        { type: 'link', id: 'l1' },
        { type: 'task', id: 'Paint fence' },
      ],
    });
  });

  test('nothing changes for someone whose view is the same', () => {
    expect(visibilityChange(data, withoutBob, links, 'carol')).toEqual({ gained: [], lost: [] });
  });
});
