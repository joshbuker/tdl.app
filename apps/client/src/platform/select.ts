import type { Platform } from '@tdl/app-core';
import { acquireTabLock } from './web/tab-lock.ts';
import { webPlatform } from './web/web-platform.ts';

/** Which build this is: the web app, or one of the native shells. Quasar decides it at build time. */
export type AppMode = 'web' | 'capacitor' | 'electron';

export function appMode(env: {
  QUASAR_CAPACITOR_MODE?: boolean;
  QUASAR_ELECTRON_MODE?: boolean;
}): AppMode {
  if (env.QUASAR_CAPACITOR_MODE === true) return 'capacitor';
  if (env.QUASAR_ELECTRON_MODE === true) return 'electron';
  return 'web';
}

/** The server's URL: the page's own origin on the web, otherwise the one the app was built for. */
export function serverUrl(mode: AppMode, env: { TDL_SERVER_URL?: string }, origin: string): string {
  if (mode === 'web') return origin;
  const url = (env.TDL_SERVER_URL ?? '').replace(/\/$/, '');
  if (url === '') throw new Error('server-url-missing');
  return url;
}

export interface LoadedPlatform {
  platform: Platform;
  /** Resolves when this app instance may use the device's storage; `onWaiting` is called if it has to wait. */
  acquireLock: (onWaiting: () => void) => Promise<void>;
}

/** Loads the platform for `mode`; the native ones are loaded only in their own builds. */
export function loadPlatform(mode: AppMode): Promise<LoadedPlatform> {
  // The native branches (Capacitor, Electron) each import their platform and `noLock` here.
  if (
    import.meta.env.QUASAR_CAPACITOR_MODE ||
    import.meta.env.QUASAR_ELECTRON_MODE ||
    mode !== 'web'
  ) {
    return Promise.reject(new Error('platform-not-built'));
  }
  return Promise.resolve({ platform: webPlatform, acquireLock: acquireTabLock });
}
