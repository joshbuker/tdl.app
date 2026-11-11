import { describe, expect, test } from 'vitest';
import { buildGraph, postrequisitesOf, prerequisitesOf } from '../../src/graph/graph.ts';
import { link, task } from '../fixtures.ts';

describe('buildGraph', () => {
  const g = buildGraph([task('A'), task('B')], [link('A', 'B'), link('A', 'X'), link('Y', 'B')]);

  test('drops links where either end is not a known task', () => {
    expect([...g.links.keys()]).toEqual(['A->B']);
  });

  test('prerequisitesOf gives the links into a task', () => {
    expect(prerequisitesOf(g, 'B')).toEqual([link('A', 'B')]);
  });

  test('postrequisitesOf gives the links out of a task', () => {
    expect(postrequisitesOf(g, 'A')).toEqual([link('A', 'B')]);
  });

  test('a task with no links, or an unknown task, has none', () => {
    expect(prerequisitesOf(g, 'A')).toEqual([]);
    expect(postrequisitesOf(g, 'Nope')).toEqual([]);
  });
});
