import type { Id } from '../model.ts';
import type { Graph } from './graph.ts';

/**
 * Strongly connected components: groups of tasks that can all reach each other. Every task is
 * in exactly one. Components come out in reverse topological order (a component is emitted
 * before any component that links into it). Tarjan's algorithm with an explicit stack, so
 * depth is unbounded.
 */
export function stronglyConnectedComponents(g: Graph): Id[][] {
  const index = new Map<Id, number>();
  const lowLink = new Map<Id, number>();
  const onStack = new Set<Id>();
  const componentStack: Id[] = [];
  const components: Id[][] = [];
  let nextIndex = 0;

  const visit = (id: Id) => {
    index.set(id, nextIndex);
    lowLink.set(id, nextIndex);
    nextIndex++;
    componentStack.push(id);
    onStack.add(id);
  };

  for (const root of g.tasks.keys()) {
    if (index.has(root)) continue;
    // Each frame is a task and how many of its outgoing links have been explored.
    const frames: { id: Id; edge: number }[] = [{ id: root, edge: 0 }];
    visit(root);

    while (frames.length > 0) {
      const frame = frames[frames.length - 1] as { id: Id; edge: number };
      const out = g.outgoing.get(frame.id) ?? [];
      const l = out[frame.edge];
      if (l !== undefined) {
        frame.edge++;
        const next = l.postrequisiteId;
        if (!index.has(next)) {
          visit(next);
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
        components.push(component);
      }
    }
  }
  return components;
}

/**
 * For pruning searches: each task's component, and that component's depth (the longest chain
 * of components leading into it). A task can only reach tasks in its own component or in
 * components strictly deeper than its own.
 */
export function componentDepths(g: Graph): { component: Map<Id, number>; depth: number[] } {
  const components = stronglyConnectedComponents(g);
  const component = new Map<Id, number>();
  components.forEach((members, c) => {
    for (const id of members) component.set(id, c);
  });

  // Components are in reverse topological order, so walk them backwards: every component
  // linking into one comes before it.
  const depth = new Array<number>(components.length).fill(0);
  for (let c = components.length - 1; c >= 0; c--) {
    for (const id of components[c] ?? []) {
      for (const l of g.outgoing.get(id) ?? []) {
        const target = component.get(l.postrequisiteId) as number;
        if (target !== c) depth[target] = Math.max(depth[target] ?? 0, (depth[c] ?? 0) + 1);
      }
    }
  }
  return { component, depth };
}
