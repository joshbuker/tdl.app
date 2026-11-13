import type { AppController, AppState } from '@tdl/app-core';
import { inject, shallowRef, triggerRef, type InjectionKey, type ShallowRef } from 'vue';

/** What the UI shows: the app core's state, or that the app is open in another tab. */
export type AppViewState = AppState | { kind: 'other-tab' };

export interface AppContext {
  state: ShallowRef<AppViewState>;
  controller: AppController;
}

export const appKey: InjectionKey<AppContext> = Symbol('app');

/** The app's state and controller, provided by the `app` boot file. */
export function useApp(): AppContext {
  const context = inject(appKey);
  if (context === undefined) throw new Error('app-not-provided');
  return context;
}

/**
 * Takes the tab lock, then starts the app core. While another tab holds the lock, the state is
 * `other-tab`. Returns the state at once; it follows the controller from then on.
 */
export function startApp(
  controller: AppController,
  acquireLock: (onWaiting: () => void) => Promise<void>,
): ShallowRef<AppViewState> {
  const state = shallowRef<AppViewState>(controller.state());
  const follow = (): void => {
    state.value = controller.state();
    // The controller also notifies when the open replica changes, with the same state object.
    triggerRef(state);
  };
  void (async () => {
    await acquireLock(() => {
      state.value = { kind: 'other-tab' };
    });
    controller.onChange(follow);
    follow();
    await controller.start();
  })().catch((error: unknown) => {
    console.error(error);
  });
  return state;
}
