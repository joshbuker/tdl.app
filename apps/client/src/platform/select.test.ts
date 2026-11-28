import { describe, expect, test } from 'vitest';
import { appMode, serverUrl } from './select.ts';

describe('appMode', () => {
  test('is the web unless Quasar builds for Capacitor or Electron', () => {
    expect(appMode({})).toBe('web');
    expect(appMode({ QUASAR_CAPACITOR_MODE: true })).toBe('capacitor');
    expect(appMode({ QUASAR_ELECTRON_MODE: true })).toBe('electron');
  });
});

describe('serverUrl', () => {
  test("is the page's own origin on the web, whatever TDL_SERVER_URL says", () => {
    expect(serverUrl('web', { TDL_SERVER_URL: 'https://x' }, 'https://tdl.app')).toBe(
      'https://tdl.app',
    );
  });

  test('is TDL_SERVER_URL without a trailing slash elsewhere', () => {
    expect(
      serverUrl('capacitor', { TDL_SERVER_URL: 'http://localhost:3000/' }, 'https://localhost'),
    ).toBe('http://localhost:3000');
  });

  test('throws server-url-missing for a native build without one', () => {
    expect(() => serverUrl('electron', {}, 'tdl://app')).toThrow('server-url-missing');
    expect(() => serverUrl('electron', { TDL_SERVER_URL: '' }, 'tdl://app')).toThrow(
      'server-url-missing',
    );
  });
});
