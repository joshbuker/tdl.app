import type { Id } from '../model.ts';
import type { Graph } from './graph.ts';
import { hasPath } from './paths.ts';

export type LinkRejection =
  | { code: 'self' }
  | { code: 'not-editable'; taskId: Id }
  | { code: 'exists' }
  | { code: 'cycle'; prerequisiteId: Id; postrequisiteId: Id }
  | { code: 'redundant'; prerequisiteId: Id; postrequisiteId: Id };

/**
 * Whether a new link prerequisite → postrequisite may be added to the graph the user sees.
 * Hard and soft links count the same. The first rule that fails wins.
 */
export function checkNewLink(
  g: Graph,
  prerequisiteId: Id,
  postrequisiteId: Id,
  canEdit: (taskId: Id) => boolean,
): { ok: true } | { ok: false; rejection: LinkRejection } {
  if (prerequisiteId === postrequisiteId) return { ok: false, rejection: { code: 'self' } };

  for (const taskId of [prerequisiteId, postrequisiteId]) {
    if (!canEdit(taskId)) return { ok: false, rejection: { code: 'not-editable', taskId } };
  }

  // Only the same direction counts: the reverse of an existing link is a cycle.
  if ((g.outgoing.get(prerequisiteId) ?? []).some((l) => l.postrequisiteId === postrequisiteId)) {
    return { ok: false, rejection: { code: 'exists' } };
  }

  // Completed tasks count for cycles, so marking a task incomplete can never create one.
  if (hasPath(g, postrequisiteId, prerequisiteId, { intermediates: 'any', minLinks: 1 })) {
    return { ok: false, rejection: { code: 'cycle', prerequisiteId, postrequisiteId } };
  }

  // A path through finished work no longer orders anything, so it doesn't make a link redundant.
  if (hasPath(g, prerequisiteId, postrequisiteId, { intermediates: 'incomplete', minLinks: 1 })) {
    return { ok: false, rejection: { code: 'redundant', prerequisiteId, postrequisiteId } };
  }

  return { ok: true };
}
