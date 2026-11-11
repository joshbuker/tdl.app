import { describe, expect, test } from 'vitest';
import { audienceOf, visibleRecords } from '../../src/access/visibility.ts';
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
