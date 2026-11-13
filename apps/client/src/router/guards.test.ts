import type { AppState } from '@tdl/app-core';
import { describe, expect, test } from 'vitest';
import { nextTick, shallowRef, triggerRef } from 'vue';
import type { AppViewState } from '../composables/useApp.ts';
import { createAuthGuard, followState, redirectFor } from './guards.ts';

const ready = { kind: 'ready', me: { defaultListId: 'inbox-id' } } as unknown as AppState;
const page = { meta: {} };
const loginPage = { meta: { public: true } };
const homePage = { meta: { home: true } };

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

  test('logged in, the home page goes to the default list', () => {
    expect(redirectFor(ready, homePage)).toBe('/lists/inbox-id');
  });

  test('logged out, the home page goes to the login page', () => {
    expect(redirectFor({ kind: 'logged-out' }, homePage)).toBe('/login');
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

  test('waits while the app is open in another tab, then decides', async () => {
    const state = shallowRef<AppViewState>({ kind: 'other-tab' });
    let decided: string | true | undefined;
    const navigation = createAuthGuard(state)(homePage).then((result) => {
      decided = result;
    });
    await Promise.resolve();
    expect(decided).toBeUndefined();

    state.value = ready;
    await navigation;
    expect(decided).toBe('/lists/inbox-id');
  });
});

describe('followState', () => {
  test('logging out in place goes to the login page', async () => {
    const state = shallowRef<AppViewState>(ready);
    const went: string[] = [];
    followState(
      state,
      () => page,
      (path) => went.push(path),
    );
    state.value = { kind: 'logged-out' };
    await nextTick();
    expect(went).toEqual(['/login']);
  });

  test('changes that keep the page open move nothing', async () => {
    const state = shallowRef<AppViewState>({ kind: 'logged-out' });
    const went: string[] = [];
    followState(
      state,
      () => loginPage,
      (path) => went.push(path),
    );
    state.value = ready;
    await nextTick();
    triggerRef(state);
    await nextTick();
    expect(went).toEqual([]);
  });

  test('leaves starting up to the navigation guard', async () => {
    const state = shallowRef<AppViewState>({ kind: 'starting' });
    const went: string[] = [];
    followState(
      state,
      () => page,
      (path) => went.push(path),
    );
    state.value = { kind: 'logged-out' };
    await nextTick();
    state.value = { kind: 'other-tab' };
    await nextTick();
    expect(went).toEqual([]);
  });
});
