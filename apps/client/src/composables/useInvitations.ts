import type { AppController, Invitation } from '@tdl/app-core';
import { shallowRef, type ShallowRef } from 'vue';

// Invitations exist only on the server, so the app asks for them: when the layout shows, on each
// navigation, and after answering one.

const invitations = shallowRef<Invitation[]>([]);

/**
 * Fetches the user's invitations. Failures (offline, or the session ended) keep what was shown,
 * since there is nothing else to show; the sync status already says why.
 */
async function refresh(controller: AppController): Promise<void> {
  if (controller.state().kind !== 'ready') {
    invitations.value = [];
    return;
  }
  try {
    invitations.value = await controller.server().invitations();
  } catch {
    // Keep the last list.
  }
}

export function useInvitations(controller: AppController): {
  invitations: ShallowRef<Invitation[]>;
  refresh: () => Promise<void>;
} {
  return { invitations, refresh: () => refresh(controller) };
}
