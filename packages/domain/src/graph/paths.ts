import type { Id } from '../model.ts';
import type { Graph } from './graph.ts';

export interface PathOptions {
  /** 'incomplete' only passes through tasks that aren't completed. `from` and `to` are never filtered. */
  intermediates: 'any' | 'incomplete';
  /** 2 ignores a direct single-link path from `from` to `to`. */
  minLinks: 1 | 2;
  /** A link to leave out of the search, e.g. the link being tested for redundancy. */
  excludeLinkId?: Id;
}

/** Whether links lead from `from` to `to`, following prerequisite → postrequisite. Iterative BFS. */
export function hasPath(g: Graph, from: Id, to: Id, opts: PathOptions): boolean {
  return searchPath(g, from, to, opts, () => true);
}

/**
 * `hasPath`, skipping intermediates for which `mayReach` is false. `mayReach` must only rule out
 * tasks that can't lead to `to` at all, so the answer is the same, only faster.
 */
export function searchPath(g: Graph, from: Id, to: Id, opts: PathOptions, mayReach: (id: Id) => boolean): boolean {
  const passable = (id: Id) =>
    (opts.intermediates === 'any' || g.tasks.get(id)?.completedAt === null) && mayReach(id);
  const visited = new Set<Id>([from]);
  const queue: Id[] = [];

  for (const l of g.outgoing.get(from) ?? []) {
    if (l.id === opts.excludeLinkId) continue;
    const next = l.postrequisiteId;
    if (next === to) {
      if (opts.minLinks === 1) return true;
      continue;
    }
    if (!visited.has(next) && passable(next)) {
      visited.add(next);
      queue.push(next);
    }
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as Id;
    for (const l of g.outgoing.get(current) ?? []) {
      if (l.id === opts.excludeLinkId) continue;
      const next = l.postrequisiteId;
      if (next === to) return true;
      if (!visited.has(next) && passable(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
