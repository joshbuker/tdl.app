import { MemoryKeyValue, type Platform } from '@tdl/app-core';
import { MemoryStore, type Transport } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { deferredPlatform } from './deferred-platform.ts';

function fakePlatform(): Platform & { saved: (string | null)[] } {
  const saved: (string | null)[] = [];
  const transport = {} as Transport;
  return {
    auth: 'token',
    saved,
    openStore: () =>
      Promise.resolve({ replicaStore: new MemoryStore(), keyValue: new MemoryKeyValue() }),
    loadToken: () => Promise.resolve('stored'),
    saveToken: (token) => {
      saved.push(token);
      return Promise.resolve();
    },
    transport: () => transport,
  };
}

describe('deferredPlatform', () => {
  test('knows its auth before the platform has loaded', () => {
    expect(deferredPlatform('token', new Promise(() => undefined)).auth).toBe('token');
    expect(deferredPlatform('cookie', new Promise(() => undefined)).auth).toBe('cookie');
  });

  test('waits for the platform, then calls through', async () => {
    const platform = fakePlatform();
    let resolve!: (loaded: { platform: Platform }) => void;
    const deferred = deferredPlatform('token', new Promise((r) => (resolve = r)));

    const token = deferred.loadToken();
    resolve({ platform });
    expect(await token).toBe('stored');
    await deferred.saveToken('new');
    expect(platform.saved).toEqual(['new']);
    expect(await deferred.openStore()).toHaveProperty('replicaStore');
    expect(deferred.transport({ baseUrl: 'https://x' })).toBeDefined();
  });

  test('a platform that failed to load rejects its calls, without an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', listener);
    try {
      const deferred = deferredPlatform('token', Promise.reject(new Error('not-built')));
      await expect(deferred.openStore()).rejects.toThrow('not-built');
      await new Promise((r) => setTimeout(r, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  test('a transport asked for before the platform has loaded throws platform-not-loaded', () => {
    const deferred = deferredPlatform('token', new Promise(() => undefined));
    expect(() => deferred.transport({ baseUrl: 'https://x' })).toThrow('platform-not-loaded');
  });
});
