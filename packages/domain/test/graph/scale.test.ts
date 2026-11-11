import { describe, expect, test } from 'vitest';
import { findLoops, redundantLinkIds } from '../../src/graph/analysis.ts';
import { buildGraph } from '../../src/graph/graph.ts';
import { checkNewLink } from '../../src/graph/link-rules.ts';
import type { Link, Task } from '../../src/model.ts';
import { nextUpTaskIds } from '../../src/next-up.ts';
import { chain, done, link, task } from '../fixtures.ts';

// The domain package has no DOM or Node types, so declare the one global these timings use.
declare const performance: { now(): number };

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 30 layers of 100 tasks. Each task after the first layer gets two prerequisites from the
 * previous three layers, so links only point to later layers: acyclic, with ~5,800 links.
 */
function layeredDag(): { tasks: Task[]; links: Link[]; first: string; last: string } {
  const layers = 30;
  const width = 100;
  const rand = random(42);
  const id = (layer: number, i: number) => `L${String(layer)}-${String(i)}`;
  const tasks: Task[] = [];
  const links: Link[] = [];
  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i < width; i++) {
      tasks.push(task(id(layer, i)));
      if (layer === 0) continue;
      const pres = new Set<string>();
      while (pres.size < 2) {
        const from = Math.max(0, layer - 1 - Math.floor(rand() * 3));
        pres.add(id(from, Math.floor(rand() * width)));
      }
      for (const pre of pres) links.push(link(pre, id(layer, i)));
    }
  }
  return { tasks, links, first: id(0, 0), last: id(layers - 1, width - 1) };
}

function timeMs(fn: () => unknown): number {
  fn(); // warm-up
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('a 1,000-task chain', () => {
  test('only the first task is next up', () => {
    const { tasks, links } = chain(1000);
    expect(nextUpTaskIds(buildGraph(tasks, links))).toEqual(new Set(['t0']));
  });

  test('with all but the last completed, only the last is next up', () => {
    const { tasks, links } = chain(1000);
    const finished = tasks.map((t) => (t.id === 't999' ? t : done(t.id)));
    expect(nextUpTaskIds(buildGraph(finished, links))).toEqual(new Set(['t999']));
  });
});

describe('a layered graph of 3,000 tasks', () => {
  const { tasks, links, first, last } = layeredDag();
  const g = buildGraph(tasks, links);

  test('has about 6,000 links and no loops', () => {
    expect(g.links.size).toBeGreaterThan(5500);
    expect(findLoops(g)).toEqual([]);
  });

  test('checkNewLink from the last layer to the first runs in under 50 ms', () => {
    expect(timeMs(() => checkNewLink(g, last, first, () => true))).toBeLessThan(50);
  });

  test('findLoops runs in under 50 ms', () => {
    expect(timeMs(() => findLoops(g))).toBeLessThan(50);
  });

  test('nextUpTaskIds runs in under 50 ms', () => {
    expect(timeMs(() => nextUpTaskIds(g))).toBeLessThan(50);
  });

  test('redundantLinkIds runs in under 500 ms', () => {
    expect(timeMs(() => redundantLinkIds(g))).toBeLessThan(500);
  });
});
