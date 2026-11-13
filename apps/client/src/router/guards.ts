import { watch, type ShallowRef } from 'vue';
import type { AppViewState } from '../composables/useApp.ts';

/**
 * The part of a route the guard reads: `meta.public` marks the pages open without logging in, and
 * `meta.home` the home page, which shows the user's default list.
 */
export interface GuardedRoute {
  meta: Record<PropertyKey, unknown>;
}

/** Where a navigation must go instead, or null to let it through. Pages other than login require being logged in. */
export function redirectFor(state: AppViewState, to: GuardedRoute): string | null {
  if (state.kind === 'logged-out' && to.meta.public !== true) return '/login';
  if (state.kind === 'ready' && to.meta.home === true) return `/lists/${state.me.defaultListId}`;
  return null;
}

/**
 * A navigation guard. While the app is starting, it waits for the app to know whether the user is
 * logged in, so nothing redirects on a guess.
 */
export function createAuthGuard(
  state: ShallowRef<AppViewState>,
): (to: GuardedRoute) => Promise<string | true> {
  return async (to) => {
    if (state.value.kind === 'starting') {
      await new Promise<void>((resolve) => {
        const stop = watch(state, (current) => {
          if (current.kind === 'starting') return;
          stop();
          resolve();
        });
      });
    }
    return redirectFor(state.value, to) ?? true;
  };
}
