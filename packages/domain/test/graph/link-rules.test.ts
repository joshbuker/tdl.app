import { describe, expect, test } from 'vitest';
import { buildGraph } from '../../src/graph/graph.ts';
import { checkNewLink } from '../../src/graph/link-rules.ts';
import { chain, done, link, task } from '../fixtures.ts';

const anyone = () => true;

describe('checkNewLink', () => {
  test('Add a prerequisite', () => {
    const g = buildGraph([task('Buy paint'), task('Paint fence')], []);
    expect(checkNewLink(g, 'Buy paint', 'Paint fence', anyone)).toEqual({ ok: true });
  });

  test('Reject a cycle', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'C')]);
    expect(checkNewLink(g, 'C', 'A', anyone)).toEqual({
      ok: false,
      rejection: { code: 'cycle', prerequisiteId: 'C', postrequisiteId: 'A' },
    });
  });

  test('Reject a redundant link', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B'), link('B', 'C')]);
    expect(checkNewLink(g, 'A', 'C', anyone)).toEqual({
      ok: false,
      rejection: { code: 'redundant', prerequisiteId: 'A', postrequisiteId: 'C' },
    });
  });

  test('Cycles through completed tasks are still rejected', () => {
    const g = buildGraph([task('A'), done('B'), task('C')], [link('A', 'B'), link('B', 'C')]);
    expect(checkNewLink(g, 'C', 'A', anyone)).toEqual({
      ok: false,
      rejection: { code: 'cycle', prerequisiteId: 'C', postrequisiteId: 'A' },
    });
  });

  test("Completed tasks don't make links redundant", () => {
    const g = buildGraph([task('A'), done('B'), task('C')], [link('A', 'B'), link('B', 'C')]);
    expect(checkNewLink(g, 'A', 'C', anyone)).toEqual({ ok: true });
  });

  test("Can't link a task to itself", () => {
    const g = buildGraph([task('A')], []);
    expect(checkNewLink(g, 'A', 'A', anyone)).toEqual({ ok: false, rejection: { code: 'self' } });
  });

  test('Link already exists', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B')]);
    expect(checkNewLink(g, 'A', 'B', anyone)).toEqual({ ok: false, rejection: { code: 'exists' } });
  });

  test('Invalid candidates are shown disabled', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B')]);
    expect(checkNewLink(g, 'B', 'A', anyone)).toEqual({
      ok: false,
      rejection: { code: 'cycle', prerequisiteId: 'B', postrequisiteId: 'A' },
    });
  });

  test('Both tasks must be editable', () => {
    const g = buildGraph([task('Buy paint'), task('Paint fence')], []);
    const canEdit = (id: string) => id !== 'Paint fence';
    const rejection = { code: 'not-editable', taskId: 'Paint fence' };
    expect(checkNewLink(g, 'Buy paint', 'Paint fence', canEdit)).toEqual({ ok: false, rejection });
    expect(checkNewLink(g, 'Paint fence', 'Buy paint', canEdit)).toEqual({ ok: false, rejection });
  });

  test('the prerequisite is named first when neither task is editable', () => {
    const g = buildGraph([task('A'), task('B')], []);
    expect(checkNewLink(g, 'B', 'A', () => false)).toEqual({
      ok: false,
      rejection: { code: 'not-editable', taskId: 'B' },
    });
  });

  test('soft links count for cycles', () => {
    const g = buildGraph([task('A'), task('B')], [link('A', 'B', { kind: 'soft' })]);
    expect(checkNewLink(g, 'B', 'A', anyone)).toEqual({
      ok: false,
      rejection: { code: 'cycle', prerequisiteId: 'B', postrequisiteId: 'A' },
    });
  });

  test('soft links count for redundancy', () => {
    const g = buildGraph([task('A'), task('B'), task('C')], [link('A', 'B', { kind: 'soft' }), link('B', 'C')]);
    expect(checkNewLink(g, 'A', 'C', anyone)).toEqual({
      ok: false,
      rejection: { code: 'redundant', prerequisiteId: 'A', postrequisiteId: 'C' },
    });
  });

  test('unbounded depth: a 1,000-task chain', () => {
    const { tasks, links } = chain(1000);
    const g = buildGraph(tasks, links);
    expect(checkNewLink(g, 't999', 't0', anyone)).toEqual({
      ok: false,
      rejection: { code: 'cycle', prerequisiteId: 't999', postrequisiteId: 't0' },
    });
    expect(checkNewLink(g, 't0', 't999', anyone)).toEqual({
      ok: false,
      rejection: { code: 'redundant', prerequisiteId: 't0', postrequisiteId: 't999' },
    });
  });
});
