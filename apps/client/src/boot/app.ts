import { defineBoot } from '#q-app';
import { AppController } from '@tdl/app-core';
import { appKey, startApp } from '@/composables/useApp.ts';
import { acquireTabLock } from '@/platform/web/tab-lock.ts';
import { webPlatform } from '@/platform/web/web-platform.ts';

// Starts the app core without waiting, so the page can show that another tab has the app open.
export default defineBoot(({ app }) => {
  const controller = new AppController({ baseUrl: location.origin, platform: webPlatform });
  const state = startApp(controller, acquireTabLock);
  app.provide(appKey, { state, controller });
});
