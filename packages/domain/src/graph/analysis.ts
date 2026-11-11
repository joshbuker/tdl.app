import type { Id } from '../model.ts';
import type { Graph } from './graph.ts';
import { componentDepths, stronglyConnectedComponents } from './components.ts';
import { searchPath } from './paths.ts';

/**
 * Links already implied by a longer path through incomplete tasks. They're kept and flagged,
 * never removed without the user asking. A second link for the same pair isn't a longer path.
 */
export function redundantLinkIds(g: Graph): Set<Id> {
  const { component, depth } = componentDepths(g);
  const depthOf = (id: Id) => depth[component.get(id) as number] as number;
  const redundant = new Set<Id>();
  for (const l of g.links.values()) {
    const opts = { intermediates: 'incomplete', minLinks: 2, excludeLinkId: l.id } as const;
    const target = l.postrequisiteId;
    const targetComponent = component.get(target);
    const targetDepth = depthOf(target);
    // Tasks at the target's depth or deeper, outside its component, can't lead to it.
    const mayReach = (id: Id) => component.get(id) === targetComponent || depthOf(id) < targetDepth;
    if (searchPath(g, l.prerequisiteId, target, opts, mayReach)) redundant.add(l.id);
  }
  return redundant;
}

/** Tasks that block each other in a cycle, and the links between them. */
export interface Loop {
  taskIds: Id[];
  linkIds: Id[];
}

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Cycles in the graph (strongly connected components of more than one task), which can form
 * when links are added on different devices or by users who can't see each other's tasks.
 * Results are sorted.
 */
export function findLoops(g: Graph): Loop[] {
  return stronglyConnectedComponents(g)
    .filter((taskIds) => taskIds.length > 1)
    .map((taskIds) => {
      const members = new Set(taskIds);
      const linkIds = taskIds.flatMap((id) =>
        (g.outgoing.get(id) ?? []).filter((l) => members.has(l.postrequisiteId)).map((l) => l.id),
      );
      return { taskIds: taskIds.sort(byCodeUnit), linkIds: linkIds.sort(byCodeUnit) };
    })
    .sort((a, b) => byCodeUnit(a.taskIds[0] as Id, b.taskIds[0] as Id));
}
