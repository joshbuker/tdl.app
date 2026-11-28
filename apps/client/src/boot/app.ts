import { defineBoot } from '#q-app';
import { AppController } from '@tdl/app-core';
import { appKey, startApp } from '@/composables/useApp.ts';
import { deferredPlatform } from '@/platform/deferred-platform.ts';
import { appMode, loadPlatform, serverUrl } from '@/platform/select.ts';
import { createAuthGuard, followState } from '@/router/guards.ts';

// Starts the app core without waiting, so the page can show that another tab has the app open.
export default defineBoot(({ app, router }) => {
  const mode = appMode(import.meta.env);
  const loaded = loadPlatform(mode);
  const controller = new AppController({
    baseUrl: serverUrl(mode, import.meta.env, location.origin),
    platform: deferredPlatform(mode === 'web' ? 'cookie' : 'token', loaded),
  });
  const state = startApp(controller, async (onWaiting) => (await loaded).acquireLock(onWaiting));
  app.provide(appKey, { state, controller });
  router.beforeEach(createAuthGuard(state));
  followState(
    state,
    () => router.currentRoute.value,
    (path) => {
      void router.replace(path);
    },
  );
});
