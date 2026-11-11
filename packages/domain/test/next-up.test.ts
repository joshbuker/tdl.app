import { describe, expect, test } from 'vitest';
import { buildGraph } from '../src/graph/graph.ts';
import { nextUpTaskIds } from '../src/next-up.ts';
import { done, link, task } from './fixtures.ts';

describe('nextUpTaskIds', () => {
  test('Unblocked task is next up', () => {
    expect(nextUpTaskIds(buildGraph([task('A')], []))).toEqual(new Set(['A']));
  });

  test('Blocked task is not next up', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B')]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['A']));
  });

  test('Completing a prerequisite unblocks', () => {
    const g = buildGraph([done('A'), task('B')], [link('A', 'B')]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['B']));
  });

  test('Marking a prerequisite incomplete blocks again', () => {
    const completed = buildGraph([done('A'), task('B')], [link('A', 'B')]);
    expect(nextUpTaskIds(completed)).toEqual(new Set(['B']));
    const reopened = buildGraph([task('A'), task('B')], [link('A', 'B')]);
    expect(nextUpTaskIds(reopened)).toEqual(new Set(['A']));
  });

  test('soft prerequisites never block', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B', { kind: 'soft' })]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['A', 'B']));
  });

  test('two hard links for the same pair still block once', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B', { id: 'x' }), link('A', 'B', { id: 'y' })]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['A']));
  });

  test('tasks in a loop stay blocked', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'A')]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['C']));
  });

  test('tasks in a loop of soft links stay blocked', () => {
    const soft = { kind: 'soft' } as const;
    const g = buildGraph([task('A'), task('B')], [link('A', 'B', soft), link('B', 'A', soft)]);
    expect(nextUpTaskIds(g)).toEqual(new Set());
  });

  test('completed tasks are never next up', () => {
    const g = buildGraph([done('A'), done('B')], []);
    expect(nextUpTaskIds(g)).toEqual(new Set());
  });

  test('prerequisites hidden from the user do not block', () => {
    const g = buildGraph([task('B')], [link('Hidden', 'B')]);
    expect(nextUpTaskIds(g)).toEqual(new Set(['B']));
  });
});
