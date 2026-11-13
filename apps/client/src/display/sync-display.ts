import type { Id } from '@tdl/domain';
import type { DeviceState, RejectedOp, Replica, ReplicaStatus } from '@tdl/sync';
import { errorKey } from '../forms/account-forms.ts';

// What the sync status and the couldn't-sync page show, worked out from the replica.

export interface SyncStatusView {
  /** `status.<status>`. */
  textKey: string;
  icon: string;
  color: 'positive' | 'grey' | 'negative';
  /** While stuck, the translation key of why. */
  reasonKey: string | null;
  /** Changes waiting to sync. */
  pending: number;
  /** Changes the server refused, shown on the couldn't-sync page. */
  rejected: number;
  /** The app is outdated: reloading the web app updates it. */
  reload: boolean;
}

const icons: Record<ReplicaStatus, string> = {
  ok: 'cloud_done',
  offline: 'cloud_off',
  'logged-out': 'lock',
  revoked: 'block',
  stuck: 'sync_problem',
  'app-outdated': 'system_update',
  'server-outdated': 'sync_problem',
};

export function syncStatusView(
  replica: Pick<Replica, 'status' | 'statusReason' | 'pending' | 'rejected'>,
): SyncStatusView {
  const status = replica.status();
  const reason = replica.statusReason();
  return {
    textKey: `status.${status}`,
    icon: icons[status],
    color: status === 'ok' ? 'positive' : status === 'offline' ? 'grey' : 'negative',
    reasonKey: status === 'stuck' && reason !== null ? errorKey(reason) : null,
    pending: replica.pending().length,
    rejected: replica.rejected().length,
    reload: status === 'app-outdated',
  };
}

export interface RejectedRow {
  opId: Id;
  /** The title of the record the change was to, or its ID when the device doesn't have it. */
  title: string;
  /** Why it was refused: the first field error's key, or the rejection's. */
  errorKey: string;
}

/** The changes the server refused, in the order they were refused. */
export function rejectedRows(state: DeviceState, rejected: readonly RejectedOp[]): RejectedRow[] {
  return rejected.map(({ op, code, errors }) => {
    const { type, id } = op.record;
    const record =
      type === 'task' ? state.tasks.get(id) : type === 'list' ? state.lists.get(id) : undefined;
    return {
      opId: op.id,
      title: record?.title ?? id,
      errorKey: errorKey(errors?.[0]?.code ?? code),
    };
  });
}

/**
 * What a list or task page shows. Every user has a default list, so until it is on the device
 * the first sync hasn't brought the user's data yet, and a missing record is still loading.
 */
export function pageContent(
  found: boolean,
  state: DeviceState,
  defaultListId: Id,
): 'found' | 'loading' | 'not-found' {
  if (found) return 'found';
  return state.lists.has(defaultListId) ? 'not-found' : 'loading';
}
