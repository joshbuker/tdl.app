import type { Platform } from '@tdl/app-core';

/**
 * A platform whose real implementation loads later. `auth` is known at once; everything else
 * waits for `loaded` and calls through. `transport` is synchronous, so it needs the platform to
 * have loaded already, which holds once `start()` has opened the store.
 */
export function deferredPlatform(
  auth: 'cookie' | 'token',
  loaded: Promise<{ platform: Platform }>,
): Platform {
  let current: Platform | null = null;
  // The empty rejection handler keeps a failing load from also being an unhandled rejection;
  // the calls below reject with it.
  loaded.then(
    ({ platform }) => {
      current = platform;
    },
    () => undefined,
  );
  const platform = async (): Promise<Platform> => (await loaded).platform;

  return {
    auth,
    openStore: async () => (await platform()).openStore(),
    loadToken: async () => (await platform()).loadToken(),
    saveToken: async (token) => (await platform()).saveToken(token),
    transport: (options) => {
      if (current === null) throw new Error('platform-not-loaded');
      return current.transport(options);
    },
  };
}
