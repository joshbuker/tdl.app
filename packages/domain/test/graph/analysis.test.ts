import { describe, expect, test } from 'vitest';
import { findLoops, redundantLinkIds } from '../../src/graph/analysis.ts';
import { buildGraph } from '../../src/graph/graph.ts';
import { chain, done, link, task } from '../fixtures.ts';

describe('redundantLinkIds', () => {
  test('Existing link that becomes redundant is kept', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'C'), link('A', 'B'), link('B', 'C')]);
    expect(redundantLinkIds(g)).toEqual(new Set(['A->C']));
  });

  test('a path through a completed task does not make a link redundant', () => {
    const g = buildGraph([task('A'), done('B'), task('C')], [link('A', 'C'), link('A', 'B'), link('B', 'C')]);
    expect(redundantLinkIds(g)).toEqual(new Set());
  });

  test("a loop's links don't make other links redundant", () => {
    const g = buildGraph(
      [task('A'), task('B'), task('C')],
      [link('A', 'B'), link('B', 'A'), link('A', 'C'), link('B', 'C')],
    );
    expect(redundantLinkIds(g)).toEqual(new Set());
  });

  test('a path that needs a link inside a loop does not count', () => {
    const g = buildGraph(
      [task('P'), task('X'), task('Q'), task('R')],
      [link('Q', 'R'), link('R', 'Q'), link('P', 'Q'), link('P', 'X'), link('X', 'R')],
    );
    expect(redundantLinkIds(g)).toEqual(new Set());
  });

  test('a path that passes a loop without using its links still counts', () => {
    const g = buildGraph(
      [task('A'), task('B'), task('C'), task('L1'), task('L2')],
      [link('A', 'B'), link('B', 'C'), link('A', 'C'), link('B', 'L1'), link('L1', 'L2'), link('L2', 'L1')],
    );
    expect(redundantLinkIds(g)).toEqual(new Set(['A->C']));
  });

  test('two links for the same pair do not make each other redundant', () => {
    const g = buildGraph([task('A'), task('C')], [link('A', 'C', { id: 'x' }), link('A', 'C', { id: 'y' })]);
    expect(redundantLinkIds(g)).toEqual(new Set());
  });
});

describe('findLoops', () => {
  test('Links that together form a cycle', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B'), link('B', 'A')]);
    expect(findLoops(g)).toEqual([{ taskIds: ['A', 'B'], linkIds: ['A->B', 'B->A'] }]);
  });

  test('a three-task loop beside a separate chain gives exactly one loop', () => {
    const g = buildGraph(
      [task('A'), task('B'), task('C'), task('X'), task('Y')],
      [link('B', 'C'), link('C', 'A'), link('A', 'B'), link('X', 'Y'), link('Y', 'A')],
    );
    expect(findLoops(g)).toEqual([{ taskIds: ['A', 'B', 'C'], linkIds: ['A->B', 'B->C', 'C->A'] }]);
  });

  test('loops are sorted by their first task ID', () => {
    const g = buildGraph(
      [task('P'), task('Q'), task('A'), task('B')],
      [link('P', 'Q'), link('Q', 'P'), link('B', 'A'), link('A', 'B')],
    );
    expect(findLoops(g).map((loop) => loop.taskIds)).toEqual([
      ['A', 'B'],
      ['P', 'Q'],
    ]);
  });

  test('an acyclic graph has no loops', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'C'), link('A', 'C')]);
    expect(findLoops(g)).toEqual([]);
  });

  test('a 1,000-task chain closed back to t0 is one loop', () => {
    const { tasks, links } = chain(1000);
    const g = buildGraph(tasks, [...links, link('t999', 't0')]);
    const loops = findLoops(g);
    expect(loops).toHaveLength(1);
    expect(loops[0]?.taskIds).toHaveLength(1000);
    expect(loops[0]?.linkIds).toHaveLength(1000);
  });
});
