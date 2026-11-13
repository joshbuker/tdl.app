import type { AppController, AppState } from '@tdl/app-core';
import type { DeviceState } from '@tdl/sync';
import {
  computed,
  inject,
  shallowRef,
  triggerRef,
  type ComputedRef,
  type InjectionKey,
  type ShallowRef,
} from 'vue';

/**
 * What the UI shows: the app core's state, that the app is open in another tab, or that it
 * couldn't start (e.g. its storage can't be opened), with the reason.
 */
export type AppViewState = AppState | { kind: 'other-tab' } | { kind: 'failed'; reason: string };

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
 * The open replica's state, or null until the app is ready. It reads the app state on every
 * change: the controller triggers it in place when the replica changes, with the same object, so
 * going through the replica (which stays the same object) wouldn't pass the change on.
 */
export function deviceOf(state: ShallowRef<AppViewState>): ComputedRef<DeviceState | null> {
  return computed(() => (state.value.kind === 'ready' ? state.value.replica.state() : null));
}

/** `deviceOf` the app's state. */
export function useDevice(): ComputedRef<DeviceState | null> {
  return deviceOf(useApp().state);
}

/**
 * Takes the tab lock, then starts the app core. While another tab holds the lock, the state is
 * `other-tab`; if starting fails, it is `failed`. Returns the state at once; it follows the
 * controller from then on.
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
  let stop = (): void => undefined;
  void (async () => {
    await acquireLock(() => {
      state.value = { kind: 'other-tab' };
    });
    stop = controller.onChange(follow);
    follow();
    await controller.start();
  })().catch((error: unknown) => {
    console.error(error);
    // The app doesn't run without its storage, so it stops here.
    stop();
    state.value = {
      kind: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    };
  });
  return state;
}
