import {
  can,
  listRole,
  mayRemoveGrant,
  mayShare,
  roleAllows,
  type Grant,
  type Id,
  type ShareTarget,
} from '@tdl/domain';
import { accessData, type DeviceState } from '@tdl/sync';

// What the sharing dialog and the list and task pages offer, from the user's role. The rules
// come from @tdl/domain (sharing.md, "What each role can do"); this module only applies them.

export interface CollaboratorRow {
  grantId: Id;
  role: Grant['role'];
  /** The grant is the user's own. */
  you: boolean;
  /** The user may remove it: they own the target. Leaving is offered separately. */
  removable: boolean;
}

export interface ShareView {
  /** The user may invite people to the target. */
  canInvite: boolean;
  /** The grants on the target, in the order they were made. */
  collaborators: CollaboratorRow[];
  /** The user's own grants on the target, which leaving removes. Empty if they have none. */
  leaveGrantIds: Id[];
}

export function shareView(state: DeviceState, userId: Id, target: ShareTarget): ShareView {
  const access = accessData(state);
  const grants = [...state.grants.values()].filter(
    (grant) => grant.target.kind === target.kind && grant.target.id === target.id,
  );
  return {
    canInvite: mayShare(access, userId, target),
    collaborators: grants.map((grant) => ({
      grantId: grant.id,
      role: grant.role,
      you: grant.userId === userId,
      removable: grant.userId !== userId && mayRemoveGrant(access, userId, grant),
    })),
    leaveGrantIds: grants.filter((grant) => grant.userId === userId).map((grant) => grant.id),
  };
}

/** Whether the sharing dialog has anything for the user to do: invite, remove someone, or leave. */
export function hasShareActions(view: ShareView): boolean {
  return (
    view.canInvite ||
    view.leaveGrantIds.length > 0 ||
    view.collaborators.some((row) => row.removable)
  );
}

export interface ListControls {
  /** The user may add tasks to the list. */
  addTasks: boolean;
  /** The sharing dialog is offered (to anyone with access): to invite and remove people, or to leave. */
  share: boolean;
}

export function listControls(state: DeviceState, userId: Id, listId: Id): ListControls {
  const access = accessData(state);
  const list = state.lists.get(listId);
  const role = listRole(access, userId, listId);
  if (list === undefined || role === null) return { addTasks: false, share: false };
  return {
    addTasks: roleAllows(role, 'addTask', 'list', list),
    share: true,
  };
}

/** Whether the user may edit, complete and link the task. */
export function canEditTask(state: DeviceState, userId: Id, taskId: Id): boolean {
  return can(accessData(state), userId, 'edit', taskId);
}
