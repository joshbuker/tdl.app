import { can, canMoveTask, listRole, roleAllows, taskAccess, type FieldError, type Id } from '@tdl/domain';
import type { MetaChange, Operation, RecordRef } from '@tdl/sync';
import type { LoadedAccess } from './access-loader.ts';

export type Decision = 'ok' | 'not-found' | 'forbidden';

const recordTypeOf: Record<MetaChange['kind'], RecordRef['type']> = {
  createList: 'list',
  createTask: 'task',
  moveTask: 'task',
  createLink: 'link',
  removeLink: 'link',
  grant: 'grant',
  revokeGrant: 'grant',
};

/**
 * Whether the operation's record type fits its change: each metadata change targets one record
 * type, and content targets a list, task or link. The operation schema doesn't check this.
 */
export function shapeErrors(op: Operation): FieldError[] {
  const expected = op.meta === null ? op.record.type !== 'grant' : recordTypeOf[op.meta.kind] === op.record.type;
  return expected ? [] : [{ field: 'record.type', code: 'invalid' }];
}

/**
 * Whether `userId` may push `op`, decided by the domain resolver over the server's own current
 * state. A record the user can't see is `not-found`; one they can see but can't change is `forbidden`.
 * Assumes `shapeErrors(op)` is empty.
 */
export function authorize(loaded: LoadedAccess, userId: Id, op: Operation): Decision {
  const { access, exists } = loaded;
  const id = op.record.id;
  const meta = op.meta;

  switch (meta?.kind) {
    case 'createList':
      return exists ? 'forbidden' : 'ok';

    case 'createTask': {
      const role = listRole(access, userId, meta.listId);
      const list = access.lists.get(meta.listId);
      if (role === null || list === undefined) return 'not-found';
      if (!roleAllows(role, 'addTask', 'list', list)) return 'forbidden';
      return exists ? 'forbidden' : 'ok';
    }

    case 'moveTask':
      if (taskAccess(access, userId, id) === null) return 'not-found';
      if (listRole(access, userId, meta.listId) === null || !access.lists.has(meta.listId)) return 'not-found';
      return canMoveTask(access, userId, id, meta.listId) ? 'ok' : 'forbidden';

    case 'createLink': {
      const ends = [meta.prerequisiteId, meta.postrequisiteId];
      if (ends.some((taskId) => taskAccess(access, userId, taskId) === null)) return 'not-found';
      if (!ends.every((taskId) => can(access, userId, 'edit', taskId))) return 'forbidden';
      return exists ? 'forbidden' : 'ok';
    }

    case 'removeLink':
      return linkDecision(loaded, userId);

    // Only the server makes grants and revokes them.
    case 'grant':
    case 'revokeGrant':
      return 'forbidden';

    case undefined:
      break;
  }

  // Content.
  const field = op.content?.field;
  switch (op.record.type) {
    case 'task':
      if (taskAccess(access, userId, id) === null) return 'not-found';
      return can(access, userId, 'edit', id) ? 'ok' : 'forbidden';
    case 'list': {
      const role = listRole(access, userId, id);
      const list = access.lists.get(id);
      if (role === null || list === undefined) return 'not-found';
      return roleAllows(role, field === 'editorsCanShare' ? 'manageAccess' : 'edit', 'list', list) ? 'ok' : 'forbidden';
    }
    case 'link':
      return linkDecision(loaded, userId);
    case 'grant':
      return 'forbidden';
  }
}

// An existing link the user can see (both its tasks), and may change (edit on both).
function linkDecision({ access, links }: LoadedAccess, userId: Id): Decision {
  const [link] = links;
  if (link === undefined) return 'not-found';
  const ends = [link.prerequisiteId, link.postrequisiteId];
  if (ends.some((taskId) => taskAccess(access, userId, taskId) === null)) return 'not-found';
  return ends.every((taskId) => can(access, userId, 'edit', taskId)) ? 'ok' : 'forbidden';
}
