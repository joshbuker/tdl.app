import type { Id } from '../model.ts';
import type { Graph } from './graph.ts';
import { hasPath } from './paths.ts';

/**
 * Links already implied by a longer path through incomplete tasks. They're kept and flagged,
 * never removed without the user asking. A second link for the same pair isn't a longer path.
 */
export function redundantLinkIds(g: Graph): Set<Id> {
  const redundant = new Set<Id>();
  for (const l of g.links.values()) {
    const opts = { intermediates: 'incomplete', minLinks: 2, excludeLinkId: l.id } as const;
    if (hasPath(g, l.prerequisiteId, l.postrequisiteId, opts)) redundant.add(l.id);
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
 * Results are sorted. Uses Tarjan's algorithm with an explicit stack, so depth is unbounded.
 */
export function findLoops(g: Graph): Loop[] {
  const index = new Map<Id, number>();
  const lowLink = new Map<Id, number>();
  const onStack = new Set<Id>();
  const componentStack: Id[] = [];
  const components: Id[][] = [];
  let nextIndex = 0;

  for (const root of g.tasks.keys()) {
    if (index.has(root)) continue;
    // Each frame is a task and how many of its outgoing links have been explored.
    const frames: { id: Id; edge: number }[] = [{ id: root, edge: 0 }];
    index.set(root, nextIndex);
    lowLink.set(root, nextIndex);
    nextIndex++;
    componentStack.push(root);
    onStack.add(root);

    while (frames.length > 0) {
      const frame = frames[frames.length - 1] as { id: Id; edge: number };
      const out = g.outgoing.get(frame.id) ?? [];
      if (frame.edge < out.length) {
        const next = (out[frame.edge] as { postrequisiteId: Id }).postrequisiteId;
        frame.edge++;
        if (!index.has(next)) {
          index.set(next, nextIndex);
          lowLink.set(next, nextIndex);
          nextIndex++;
          componentStack.push(next);
          onStack.add(next);
          frames.push({ id: next, edge: 0 });
        } else if (onStack.has(next)) {
          lowLink.set(frame.id, Math.min(lowLink.get(frame.id) as number, index.get(next) as number));
        }
        continue;
      }

      frames.pop();
      const low = lowLink.get(frame.id) as number;
      const parent = frames[frames.length - 1];
      if (parent !== undefined) {
        lowLink.set(parent.id, Math.min(lowLink.get(parent.id) as number, low));
      }
      if (low === index.get(frame.id)) {
        const component: Id[] = [];
        for (let member = componentStack.pop(); member !== undefined; member = componentStack.pop()) {
          onStack.delete(member);
          component.push(member);
          if (member === frame.id) break;
        }
        if (component.length > 1) components.push(component);
      }
    }
  }

  return components
    .map((taskIds) => {
      const members = new Set(taskIds);
      const linkIds = taskIds.flatMap((id) =>
        (g.outgoing.get(id) ?? []).filter((l) => members.has(l.postrequisiteId)).map((l) => l.id),
      );
      return { taskIds: taskIds.sort(byCodeUnit), linkIds: linkIds.sort(byCodeUnit) };
    })
    .sort((a, b) => byCodeUnit(a.taskIds[0] as Id, b.taskIds[0] as Id));
}
