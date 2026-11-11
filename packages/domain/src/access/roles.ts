import type { List, Role } from '../model.ts';

export type Action = 'view' | 'comment' | 'edit' | 'addTask' | 'deleteTask' | 'shareTask' | 'manageAccess';

const rank: Record<Role, number> = { viewer: 0, commenter: 1, editor: 2, owner: 3 };

/** Whether role `a` is at least role `b`. */
export function atLeast(a: Role, b: Role): boolean {
  return rank[a] >= rank[b];
}

/**
 * What a role allows, following "What each role can do" in docs/features/app/sharing.md.
 * `via` is whether the role comes from a grant on the task's list or on the task itself.
 */
export function roleAllows(
  role: Role,
  action: Action,
  via: 'list' | 'task',
  list: Pick<List, 'editorsCanShare'>,
): boolean {
  switch (action) {
    case 'view':
      return true;
    case 'comment':
      return atLeast(role, 'commenter');
    case 'edit':
      return atLeast(role, 'editor');
    case 'addTask':
    case 'deleteTask':
      return role === 'owner' || (role === 'editor' && via === 'list');
    case 'shareTask':
      return role === 'owner' || (role === 'editor' && via === 'list' && list.editorsCanShare);
    case 'manageAccess':
      return role === 'owner';
  }
}
