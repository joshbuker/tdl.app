import type { Id, Link, Task } from '../model.ts';

/** The tasks one user can see, and the links between them, indexed both ways. */
export interface Graph {
  tasks: ReadonlyMap<Id, Task>;
  links: ReadonlyMap<Id, Link>;
  /** Task ID → links where it is the prerequisite. */
  outgoing: ReadonlyMap<Id, readonly Link[]>;
  /** Task ID → links where it is the postrequisite. */
  incoming: ReadonlyMap<Id, readonly Link[]>;
}

const none: readonly Link[] = [];

/**
 * Builds a graph from tasks and links. Links where either end isn't among `tasks` are dropped,
 * so tasks hidden from the user never block, form loops or make links redundant.
 */
export function buildGraph(tasks: Iterable<Task>, links: Iterable<Link>): Graph {
  const taskMap = new Map<Id, Task>();
  for (const t of tasks) taskMap.set(t.id, t);

  const linkMap = new Map<Id, Link>();
  const outgoing = new Map<Id, Link[]>();
  const incoming = new Map<Id, Link[]>();
  for (const l of links) {
    if (!taskMap.has(l.prerequisiteId) || !taskMap.has(l.postrequisiteId)) continue;
    linkMap.set(l.id, l);
    push(outgoing, l.prerequisiteId, l);
    push(incoming, l.postrequisiteId, l);
  }
  return { tasks: taskMap, links: linkMap, outgoing, incoming };
}

function push(map: Map<Id, Link[]>, key: Id, l: Link): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [l]);
  else list.push(l);
}

/** Links whose postrequisite is `taskId`. */
export function prerequisitesOf(g: Graph, taskId: Id): Link[] {
  return [...(g.incoming.get(taskId) ?? none)];
}

/** Links whose prerequisite is `taskId`. */
export function postrequisitesOf(g: Graph, taskId: Id): Link[] {
  return [...(g.outgoing.get(taskId) ?? none)];
}
