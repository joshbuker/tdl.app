import { describe, expect, test } from 'vitest';
import { buildGraph } from '../../src/graph/graph.ts';
import { hasPath } from '../../src/graph/paths.ts';
import { chain, done, link, task } from '../fixtures.ts';

const any1 = { intermediates: 'any', minLinks: 1 } as const;

describe('hasPath', () => {
  const abc = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'C')]);

  test('follows links from prerequisite to postrequisite', () => {
    expect(hasPath(abc, 'A', 'C', any1)).toBe(true);
  });

  test('does not follow links backwards', () => {
    expect(hasPath(abc, 'C', 'A', any1)).toBe(false);
  });

  test('incomplete intermediates skip completed tasks', () => {
    const g = buildGraph([task('A'), done('B'), task('C')], [link('A', 'B'), link('B', 'C')]);
    expect(hasPath(g, 'A', 'C', { intermediates: 'incomplete', minLinks: 1 })).toBe(false);
    expect(hasPath(g, 'A', 'C', any1)).toBe(true);
  });

  test('endpoints are never filtered by completion', () => {
    const g = buildGraph([done('A'), task('B'), done('C')], [link('A', 'B'), link('B', 'C')]);
    expect(hasPath(g, 'A', 'C', { intermediates: 'incomplete', minLinks: 1 })).toBe(true);
  });

  test('minLinks 2 finds the longer path while excluding the direct link', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'C'), link('A', 'C')]);
    expect(hasPath(g, 'A', 'C', { intermediates: 'any', minLinks: 2, excludeLinkId: 'A->C' })).toBe(true);
  });

  test('minLinks 2 ignores the direct single-link path', () => {
    const g = buildGraph([task('A'), task('C')], [link('A', 'C')]);
    expect(hasPath(g, 'A', 'C', { intermediates: 'any', minLinks: 2 })).toBe(false);
  });

  test('a duplicate link for the same pair is not a longer path', () => {
    const g = buildGraph([task('A'), task('C')], [link('A', 'C', { id: 'x' }), link('A', 'C', { id: 'y' })]);
    expect(hasPath(g, 'A', 'C', { intermediates: 'any', minLinks: 2, excludeLinkId: 'x' })).toBe(false);
  });

  test('terminates on a cycle', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'A')]);
    expect(hasPath(g, 'A', 'C', any1)).toBe(false);
  });

  test('unbounded depth: a 1,000-task chain', () => {
    const { tasks, links } = chain(1000);
    const g = buildGraph(tasks, links);
    expect(hasPath(g, 't0', 't999', any1)).toBe(true);
    expect(hasPath(g, 't999', 't0', any1)).toBe(false);
  });
});
