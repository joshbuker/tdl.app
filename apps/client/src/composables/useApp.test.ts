import type { AppController, AppState } from '@tdl/app-core';
import { materialize, type DeviceState } from '@tdl/sync';
import { describe, expect, test, vi } from 'vitest';
import { shallowRef, triggerRef } from 'vue';
import { deviceOf, startApp, type AppViewState } from './useApp.ts';

function fakeController() {
  let current: AppState = { kind: 'starting' };
  const listeners = new Set<() => void>();
  const fake = {
    started: false,
    state: () => current,
    onChange(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      fake.started = true;
      current = { kind: 'logged-out' };
      for (const listener of listeners) listener();
      return Promise.resolve();
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
  return fake;
}

describe('startApp', () => {
  test('starts the app once the tab lock is free, showing the other tab until then', async () => {
    const controller = fakeController();
    let free = (): void => undefined;
    const state = startApp(controller as unknown as AppController, (onWaiting) => {
      onWaiting();
      return new Promise<void>((resolve) => (free = resolve));
    });

    await Promise.resolve();
    expect(state.value).toEqual({ kind: 'other-tab' });
    expect(controller.started).toBe(false);

    free();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.started).toBe(true);
    expect(state.value).toEqual({ kind: 'logged-out' });
  });

  test('a free lock starts the app without showing the other tab', async () => {
    const controller = fakeController();
    const seen: string[] = [];
    const state = startApp(controller as unknown as AppController, () => Promise.resolve());
    seen.push(state.value.kind);
    await new Promise((resolve) => setTimeout(resolve, 0));
    seen.push(state.value.kind);
    expect(seen).toEqual(['starting', 'logged-out']);
  });

  test('a failed start shows why, and stops following the controller', async () => {
    const controller = fakeController();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    controller.start = () => Promise.reject(new Error('storage-blocked'));
    const state = startApp(controller as unknown as AppController, () => Promise.resolve());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.value).toEqual({ kind: 'failed', reason: 'storage-blocked' });
    expect(error).toHaveBeenCalledOnce();
    controller.notify();
    expect(state.value.kind).toBe('failed');
    error.mockRestore();
  });

  test('a failure that is not an Error still shows a reason', async () => {
    const controller = fakeController();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
    controller.start = () => Promise.reject('quota exceeded');
    const state = startApp(controller as unknown as AppController, () => Promise.resolve());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.value).toEqual({ kind: 'failed', reason: 'quota exceeded' });
    error.mockRestore();
  });
});

describe('deviceOf', () => {
  test('follows the replica state when the app state is triggered in place', () => {
    let current: DeviceState = materialize([]);
    const replica = { state: () => current };
    const ready = { kind: 'ready', replica } as unknown as AppState;
    const state = shallowRef<AppViewState>(ready);
    const device = deviceOf(state);
    expect(device.value).toBe(current);

    current = materialize([]);
    triggerRef(state);
    expect(device.value).toBe(current);
  });

  test('is null until the app is ready', () => {
    expect(deviceOf(shallowRef<AppViewState>({ kind: 'starting' })).value).toBeNull();
  });
});
