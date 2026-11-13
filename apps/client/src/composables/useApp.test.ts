import type { AppController, AppState } from '@tdl/app-core';
import { describe, expect, test } from 'vitest';
import { startApp } from './useApp.ts';

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
});
