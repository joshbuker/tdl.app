import type { AppController } from '@tdl/app-core';
import type { AppViewState } from '../composables/useApp.ts';

/** What the logout warning shows: how many changes haven't synced, and whether the session ended. */
export interface UnsyncedWarning {
  count: number;
  sessionEnded: boolean;
}

/**
 * Logs out, or, with unsynced changes and no `choice`, returns the warning to show instead
 * (changing nothing). Null means the user is logged out.
 */
export async function logOut(
  controller: Pick<AppController, 'logOut'>,
  choice?: 'discard',
): Promise<UnsyncedWarning | null> {
  const result = await controller.logOut(choice);
  return result.kind === 'unsynced'
    ? { count: result.count, sessionEnded: result.sessionEnded }
    : null;
}

/**
 * Whether the log-in-again dialog shows: while the session has ended, except while the logout
 * warning is open over it (its "Log in again" closes the warning, bringing the dialog back).
 */
export function showSessionEnded(state: AppViewState, warning: UnsyncedWarning | null): boolean {
  return state.kind === 'ready' && state.sessionEnded && warning === null;
}
