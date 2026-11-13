import type { Platform } from '@tdl/app-core';
import { openDeviceStore } from '@tdl/device-store';
import { createHttpTransport } from '@tdl/sync';
import { createWebDriver } from './web-driver.ts';

/** The web app: the session cookie, and the device's database in SQLite Wasm in a worker. */
export const webPlatform: Platform = {
  auth: 'cookie',
  openStore: async () => openDeviceStore(await createWebDriver()),
  loadToken: () => Promise.resolve(null),
  saveToken: () => Promise.resolve(),
  // The web app is served by its server, so the API is on the page's own origin.
  transport: (options) => createHttpTransport({ ...options, baseUrl: location.origin }),
};
