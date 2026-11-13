import type { AppState, LogOutResult } from '@tdl/app-core';
import { describe, expect, test } from 'vitest';
import { logOut, showSessionEnded } from './log-out.ts';

const ready = (sessionEnded: boolean) => ({ kind: 'ready', sessionEnded }) as unknown as AppState;

describe('logOut', () => {
  test('logged out, there is no warning to show', async () => {
    const done = (): Promise<LogOutResult> => Promise.resolve({ kind: 'done' });
    await expect(logOut({ logOut: done })).resolves.toBeNull();
  });

  test('with unsynced changes, the warning says how many and whether the session ended', async () => {
    const unsynced = (): Promise<LogOutResult> =>
      Promise.resolve({ kind: 'unsynced', count: 2, sessionEnded: true });
    await expect(logOut({ logOut: unsynced })).resolves.toEqual({ count: 2, sessionEnded: true });
  });

  test('discarding passes the choice on', async () => {
    const choices: unknown[] = [];
    const record = (choice?: 'discard'): Promise<LogOutResult> => {
      choices.push(choice);
      return Promise.resolve({ kind: 'done' });
    };
    await logOut({ logOut: record }, 'discard');
    expect(choices).toEqual(['discard']);
  });
});

describe('showSessionEnded', () => {
  const warning = { count: 1, sessionEnded: true };

  test('shows while the session has ended', () => {
    expect(showSessionEnded(ready(true), null)).toBe(true);
  });

  test('gives way to the logout warning while it is open', () => {
    expect(showSessionEnded(ready(true), warning)).toBe(false);
  });

  test('stays hidden while the session is live, or logged out', () => {
    expect(showSessionEnded(ready(false), null)).toBe(false);
    expect(showSessionEnded({ kind: 'logged-out' }, null)).toBe(false);
  });
});
