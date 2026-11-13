import { watch, type ShallowRef, type WatchStopHandle } from 'vue';
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

/** Whether the app doesn't know yet if the user is logged in: it's starting, or waiting for another tab. */
function undecided(state: AppViewState): boolean {
  return state.kind === 'starting' || state.kind === 'other-tab';
}

/**
 * A navigation guard. While the app is starting (or open in another tab), it waits for the app to
 * know whether the user is logged in, so nothing redirects on a guess.
 */
export function createAuthGuard(
  state: ShallowRef<AppViewState>,
): (to: GuardedRoute) => Promise<string | true> {
  return async (to) => {
    if (undecided(state.value)) {
      await new Promise<void>((resolve) => {
        const stop = watch(state, (current) => {
          if (undecided(current)) return;
          stop();
          resolve();
        });
      });
    }
    return redirectFor(state.value, to) ?? true;
  };
}

/**
 * Moves the user when the state changes under the current page, which the guard (run only on
 * navigation) doesn't see: e.g. logging out, or a revoked session, goes to the login page. Changes
 * while the app starts are left to the guard, which is still deciding the first navigation.
 */
export function followState(
  state: ShallowRef<AppViewState>,
  currentRoute: () => GuardedRoute,
  go: (path: string) => void,
): WatchStopHandle {
  return watch(state, (current, previous) => {
    if (undecided(previous) || undecided(current)) return;
    const to = redirectFor(current, currentRoute());
    if (to !== null) go(to);
  });
}
