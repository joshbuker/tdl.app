import { can, visibleTaskIds, type AccessData } from './access/resolver.ts';
import { buildGraph, type Graph } from './graph/graph.ts';
import { checkNewLink } from './graph/link-rules.ts';
import type { Id, Link, Task } from './model.ts';

/**
 * The graph one user sees: only tasks visible to them, so hidden tasks and their links vanish
 * (docs/design-decisions/visibility-scoped-graph.md).
 */
export function userGraph(data: AccessData, tasks: Iterable<Task>, links: Iterable<Link>, userId: Id): Graph {
  const visible = visibleTaskIds(data, userId);
  const seen: Task[] = [];
  for (const t of tasks) {
    if (visible.has(t.id)) seen.push(t);
  }
  return buildGraph(seen, links);
}

/**
 * `checkNewLink` for one user, on their own graph. A task they can't see is refused as
 * not editable, the same as one they can only view, so a rejection never reveals hidden tasks.
 */
export function checkNewLinkFor(
  data: AccessData,
  tasks: Iterable<Task>,
  links: Iterable<Link>,
  userId: Id,
  prerequisiteId: Id,
  postrequisiteId: Id,
): ReturnType<typeof checkNewLink> {
  const g = userGraph(data, tasks, links, userId);
  return checkNewLink(g, prerequisiteId, postrequisiteId, (id) => can(data, userId, 'edit', id));
}
