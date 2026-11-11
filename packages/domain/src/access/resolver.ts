import type { Grant, Id, List, Role, Task } from '../model.ts';
import { atLeast, roleAllows, type Action } from './roles.ts';

/** What the resolver needs to know about lists, tasks and grants. */
export interface AccessData {
  lists: ReadonlyMap<Id, List>;
  tasks: ReadonlyMap<Id, Pick<Task, 'id' | 'listId'>>;
  grants: readonly Grant[];
}

function highest(roles: Iterable<Role>): Role | null {
  let best: Role | null = null;
  for (const role of roles) {
    if (best === null || !atLeast(best, role)) best = role;
  }
  return best;
}

function grantRoles(data: AccessData, userId: Id, kind: 'list' | 'task', id: Id): Role[] {
  return data.grants
    .filter((g) => g.userId === userId && g.target.kind === kind && g.target.id === id)
    .map((g) => g.role);
}

/** The user's role on a list: owner, else their highest list grant, else null. A missing list gives null. */
export function listRole(data: AccessData, userId: Id, listId: Id): Role | null {
  const list = data.lists.get(listId);
  if (list === undefined) return null;
  if (list.ownerId === userId) return 'owner';
  return highest(grantRoles(data, userId, 'list', listId));
}

/**
 * The user's role on a task: the higher of their role on its list and their task grants.
 * On a tie it counts as through the list. A missing task, or a task whose list is missing and
 * that has no task grant, gives null.
 */
export function taskAccess(data: AccessData, userId: Id, taskId: Id): { role: Role; via: 'list' | 'task' } | null {
  const task = data.tasks.get(taskId);
  if (task === undefined) return null;
  const fromList = listRole(data, userId, task.listId);
  const fromTask = highest(grantRoles(data, userId, 'task', taskId));
  if (fromList === null && fromTask === null) return null;
  if (fromTask === null || (fromList !== null && atLeast(fromList, fromTask))) {
    return { role: fromList as Role, via: 'list' };
  }
  return { role: fromTask, via: 'task' };
}

/** Whether the user may take an action on a task. */
export function can(data: AccessData, userId: Id, action: Action, taskId: Id): boolean {
  const access = taskAccess(data, userId, taskId);
  if (access === null) return false;
  const task = data.tasks.get(taskId);
  const list = task === undefined ? undefined : data.lists.get(task.listId);
  return roleAllows(access.role, action, access.via, list ?? { editorsCanShare: false });
}

/** Every task the user can see. */
export function visibleTaskIds(data: AccessData, userId: Id): Set<Id> {
  const visible = new Set<Id>();
  for (const id of data.tasks.keys()) {
    if (taskAccess(data, userId, id) !== null) visible.add(id);
  }
  return visible;
}

/**
 * Whether the user may move a task to another list. They need editor or above through list
 * roles on both lists, and only the owner of the task's list may move it to a list with a
 * different owner. Checked against both the current and the destination list.
 */
export function canMoveTask(data: AccessData, userId: Id, taskId: Id, toListId: Id): boolean {
  const task = data.tasks.get(taskId);
  if (task === undefined) return false;
  const from = data.lists.get(task.listId);
  const to = data.lists.get(toListId);
  if (from === undefined || to === undefined) return false;

  const fromRole = listRole(data, userId, from.id);
  const toRole = listRole(data, userId, to.id);
  if (fromRole === null || toRole === null) return false;
  if (!atLeast(fromRole, 'editor') || !atLeast(toRole, 'editor')) return false;
  return from.ownerId === to.ownerId || from.ownerId === userId;
}
