import { atLeast, can, listRole, roleAllows, taskAccess, type AccessData, type Action, type Grant, type Id, type Role } from '@tdl/domain';
import type { Decision } from '../sync/authorize.ts';

export type Target = Grant['target'];

/** The user's role on a list or task, as the domain resolver decides it; null if they can't see it. */
export function roleOn(access: AccessData, userId: Id, target: Target): Role | null {
  return target.kind === 'list' ? listRole(access, userId, target.id) : (taskAccess(access, userId, target.id)?.role ?? null);
}

/** Whether the user may invite people to the target: `manageAccess` on a list, `shareTask` on a task. */
export function shareDecision(access: AccessData, userId: Id, target: Target): Decision {
  if (roleOn(access, userId, target) === null) return 'not-found';
  return allows(access, userId, target, target.kind === 'list' ? 'manageAccess' : 'shareTask') ? 'ok' : 'forbidden';
}

/** Whether the user already has `role` or higher on the target, so inviting them would change nothing. */
export function alreadyShared(access: AccessData, userId: Id, target: Target, role: Role): boolean {
  const current = roleOn(access, userId, target);
  return current !== null && atLeast(current, role);
}

/** Whether the user may remove the grant: they are its grantee (leaving), or may manage access to its target (its owner). */
export function mayRemoveGrant(access: AccessData, userId: Id, grant: Pick<Grant, 'userId' | 'target'>): boolean {
  return grant.userId === userId || allows(access, userId, grant.target, 'manageAccess');
}

function allows(access: AccessData, userId: Id, target: Target, action: Action): boolean {
  if (target.kind === 'task') return can(access, userId, action, target.id);
  const role = listRole(access, userId, target.id);
  const list = access.lists.get(target.id);
  return role !== null && list !== undefined && roleAllows(role, action, 'list', list);
}
