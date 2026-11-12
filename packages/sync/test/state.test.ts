import { describe, expect, test } from 'vitest';
import { accessData, historyOf, materialize } from '../src/state.ts';
import {
  at,
  createLink,
  createList,
  createTask,
  grant,
  moveTask,
  removeLink,
  revokeGrant,
  setField,
} from './ops.ts';

const alice = 'alice';
const bob = 'bob';

describe('materialize', () => {
  test('create then title gives a task titled correctly', () => {
    const state = materialize([
      createTask('t1', 'l1', at(1), alice),
      setField('task', 't1', 'title', 'Paint', at(2), alice),
    ]);
    expect(state.tasks.get('t1')).toMatchObject({ id: 't1', listId: 'l1', title: 'Paint', notes: '', completedAt: null });
  });

  test('createdAt is the wall-clock part of the create HLC', () => {
    const state = materialize([createTask('t1', 'l1', at(1_700_000_000_000), alice)]);
    expect(state.tasks.get('t1')?.createdAt).toBe('2023-11-14T22:13:20.000Z');
  });

  test('the newest title wins regardless of arrival order', () => {
    const ops = [
      createTask('t1', 'l1', at(1), alice),
      setField('task', 't1', 'title', 'old', at(2), alice),
      setField('task', 't1', 'title', 'new', at(3, 'b'), bob),
    ];
    expect(materialize(ops).tasks.get('t1')?.title).toBe('new');
    expect(materialize([...ops].reverse()).tasks.get('t1')?.title).toBe('new');
  });

  test('equal HLCs are broken by operation id, whatever the input order', () => {
    const a = setField('task', 't1', 'title', 'first', at(2), alice);
    const b = setField('task', 't1', 'title', 'second', at(2), bob);
    const create = createTask('t1', 'l1', at(1), alice);
    const winner = a.id > b.id ? 'first' : 'second';
    expect(materialize([create, a, b]).tasks.get('t1')?.title).toBe(winner);
    expect(materialize([b, a, create]).tasks.get('t1')?.title).toBe(winner);
  });

  test('edits to title and notes from different devices are both kept', () => {
    const state = materialize([
      createTask('t1', 'l1', at(1), alice),
      setField('task', 't1', 'title', 'T', at(2, 'a'), alice),
      setField('task', 't1', 'notes', 'N', at(2, 'b'), bob),
    ]);
    expect(state.tasks.get('t1')).toMatchObject({ title: 'T', notes: 'N' });
  });

  test('removeLink deletes the link from state', () => {
    const state = materialize([
      createLink('k1', 't1', 't2', at(1), alice),
      setField('link', 'k1', 'reason', 'why', at(2), alice),
      removeLink('k1', at(3), alice),
    ]);
    expect(state.links.size).toBe(0);
  });

  test('a link takes defaults and content fields', () => {
    const state = materialize([
      createLink('k1', 't1', 't2', at(1), alice),
      createLink('k2', 't1', 't3', at(1), alice),
      setField('link', 'k2', 'kind', 'soft', at(2), alice),
    ]);
    expect(state.links.get('k1')).toMatchObject({ kind: 'hard', reason: '', prerequisiteId: 't1', postrequisiteId: 't2' });
    expect(state.links.get('k2')?.kind).toBe('soft');
  });

  test('revokeGrant drops the grant', () => {
    const target = { kind: 'list', id: 'l1' } as const;
    const granted = grant('g1', bob, target, 'editor', at(1), alice);
    expect(materialize([granted]).grants.get('g1')).toEqual({ id: 'g1', userId: bob, target, role: 'editor' });
    expect(materialize([granted, revokeGrant('g1', at(2), alice)]).grants.size).toBe(0);
  });

  test('moveTask changes listId', () => {
    const state = materialize([createTask('t1', 'l1', at(1), alice), moveTask('t1', 'l2', at(2), alice)]);
    expect(state.tasks.get('t1')?.listId).toBe('l2');
  });

  test('a content operation for an unknown record is ignored', () => {
    const state = materialize([setField('task', 'ghost', 'title', 'x', at(1), alice)]);
    expect(state.tasks.size).toBe(0);
  });

  test('the list owner is the author of createList, with list defaults', () => {
    const state = materialize([
      createList('l1', at(1), alice),
      setField('list', 'l1', 'title', 'Home', at(2), bob),
      setField('list', 'l1', 'editorsCanShare', true, at(3), alice),
    ]);
    expect(state.lists.get('l1')).toMatchObject({ ownerId: alice, title: 'Home', editorsCanShare: true });
  });

  test('accessData exposes lists, tasks and grants', () => {
    const state = materialize([
      createList('l1', at(1), alice),
      grant('g1', bob, { kind: 'list', id: 'l1' }, 'viewer', at(2), alice),
    ]);
    const data = accessData(state);
    expect(data.lists.get('l1')?.ownerId).toBe(alice);
    expect(data.grants).toHaveLength(1);
  });
});

describe('historyOf', () => {
  test('lists the link create and remove entries for both tasks', () => {
    const ops = [
      createTask('t1', 'l1', at(1), alice),
      createTask('t2', 'l1', at(1), alice),
      createLink('k1', 't1', 't2', at(2), alice),
      removeLink('k1', at(3), bob),
    ];
    for (const taskId of ['t1', 't2']) {
      const kinds = historyOf(ops, taskId).map((e) => (e.change as { kind?: string }).kind);
      expect(kinds).toContain('createLink');
      expect(kinds).toContain('removeLink');
    }
    expect(historyOf(ops, 't1').find((e) => e.recordType === 'link')).toMatchObject({ recordId: 'k1', authorId: alice });
  });

  test('conflicting renames both appear in HLC order and the later one wins', () => {
    const ops = [
      createTask('t1', 'l1', at(1), alice),
      setField('task', 't1', 'title', 'Stain fence', at(3, 'b'), bob),
      setField('task', 't1', 'title', 'Paint the fence', at(2, 'a'), alice),
      setField('task', 'other', 'title', 'unrelated', at(2), alice),
    ];
    expect(materialize(ops).tasks.get('t1')?.title).toBe('Stain fence');
    const renames = historyOf(ops, 't1').filter((e) => 'field' in e.change);
    expect(renames.map((e) => (e.change as { value: unknown }).value)).toEqual(['Paint the fence', 'Stain fence']);
  });
});
