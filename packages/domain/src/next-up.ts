import { findLoops } from './graph/analysis.ts';
import { prerequisitesOf, type Graph } from './graph/graph.ts';
import type { Id } from './model.ts';

/**
 * Tasks the user can work on now: incomplete, not in a loop, and with every hard prerequisite
 * completed. Soft prerequisites never block, and prerequisites hidden from the user (absent
 * from `g`) don't exist here.
 */
export function nextUpTaskIds(g: Graph): Set<Id> {
  const inLoop = new Set(findLoops(g).flatMap((loop) => loop.taskIds));
  const result = new Set<Id>();
  for (const t of g.tasks.values()) {
    if (t.completedAt !== null || inLoop.has(t.id)) continue;
    const blocked = prerequisitesOf(g, t.id).some(
      (l) => l.kind === 'hard' && g.tasks.get(l.prerequisiteId)?.completedAt === null,
    );
    if (!blocked) result.add(t.id);
  }
  return result;
}
