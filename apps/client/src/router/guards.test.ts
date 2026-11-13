import type { AppState } from '@tdl/app-core';
import { describe, expect, test } from 'vitest';
import { shallowRef } from 'vue';
import type { AppViewState } from '../composables/useApp.ts';
import { createAuthGuard, redirectFor } from './guards.ts';

const ready = { kind: 'ready' } as unknown as AppState;
const page = { meta: {} };
const loginPage = { meta: { public: true } };

describe('redirectFor', () => {
  test('logged out, a page other than login goes to the login page', () => {
    expect(redirectFor({ kind: 'logged-out' }, page)).toBe('/login');
  });

  test('logged out, the login and sign-up pages open', () => {
    expect(redirectFor({ kind: 'logged-out' }, loginPage)).toBeNull();
  });

  test('logged in, any page opens', () => {
    expect(redirectFor(ready, page)).toBeNull();
  });

  test('open in another tab, nothing redirects', () => {
    expect(redirectFor({ kind: 'other-tab' }, page)).toBeNull();
  });
});

describe('createAuthGuard', () => {
  test('waits while the app is starting, then decides', async () => {
    const state = shallowRef<AppViewState>({ kind: 'starting' });
    const guard = createAuthGuard(state);
    let decided: string | true | undefined;
    const navigation = guard(page).then((result) => {
      decided = result;
    });
    await Promise.resolve();
    expect(decided).toBeUndefined();

    state.value = { kind: 'logged-out' };
    await navigation;
    expect(decided).toBe('/login');
  });

  test('lets the page open once the app is ready', async () => {
    const state = shallowRef<AppViewState>(ready);
    await expect(createAuthGuard(state)(page)).resolves.toBe(true);
  });
});
