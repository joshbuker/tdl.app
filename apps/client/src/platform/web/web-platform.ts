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
  // The app's boot file gives the controller the page's own origin as its `baseUrl`.
  transport: (options) => createHttpTransport(options),
};
