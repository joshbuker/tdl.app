import type { Grant, Id, Role } from '../model.ts';
import { can, listRole, taskAccess, type AccessData } from './resolver.ts';
import { atLeast, roleAllows, type Action } from './roles.ts';

// Who may share what, following "Roles and grants" in docs/features/app/sharing.md. The server
// enforces these; apps use them to decide what to offer.

/** What can be shared: a list, or a single task. */
export type ShareTarget = Grant['target'];

/** The user's role on a list or task; null if they can't see it. */
export function roleOn(access: AccessData, userId: Id, target: ShareTarget): Role | null {
  return target.kind === 'list' ? listRole(access, userId, target.id) : (taskAccess(access, userId, target.id)?.role ?? null);
}

function allows(access: AccessData, userId: Id, target: ShareTarget, action: Action): boolean {
  if (target.kind === 'task') return can(access, userId, action, target.id);
  const role = listRole(access, userId, target.id);
  const list = access.lists.get(target.id);
  return role !== null && list !== undefined && roleAllows(role, action, 'list', list);
}

/** Whether the user may invite people to the target: `manageAccess` on a list, `shareTask` on a task. */
export function mayShare(access: AccessData, userId: Id, target: ShareTarget): boolean {
  return allows(access, userId, target, target.kind === 'list' ? 'manageAccess' : 'shareTask');
}

/** Whether the user may remove the grant: they are its grantee (leaving), or may manage access to its target (its owner). */
export function mayRemoveGrant(access: AccessData, userId: Id, grant: Pick<Grant, 'userId' | 'target'>): boolean {
  return grant.userId === userId || allows(access, userId, grant.target, 'manageAccess');
}

/** Whether the user already has `role` or higher on the target, so inviting them would change nothing. */
export function alreadyShared(access: AccessData, userId: Id, target: ShareTarget, role: Role): boolean {
  const current = roleOn(access, userId, target);
  return current !== null && atLeast(current, role);
}
