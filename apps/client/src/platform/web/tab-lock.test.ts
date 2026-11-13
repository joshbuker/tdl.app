import { describe, expect, test, vi } from 'vitest';
import { holdTabLock } from './tab-lock.ts';

// Node has the Web Locks API too. Each test uses its own lock name, as a held lock is never released.
describe('tab lock', () => {
  test('a free lock is taken at once, without waiting', async () => {
    const onWaiting = vi.fn();
    await holdTabLock(navigator.locks, 'free', onWaiting);
    expect(onWaiting).not.toHaveBeenCalled();
  });

  test('a held lock calls onWaiting, then is taken once released', async () => {
    let release = (): void => undefined;
    await new Promise<void>((taken) => {
      void navigator.locks.request('held', () => {
        taken();
        return new Promise<void>((resolve) => (release = resolve));
      });
    });

    const onWaiting = vi.fn();
    let acquired = false;
    const waiting = holdTabLock(navigator.locks, 'held', onWaiting).then(() => (acquired = true));
    await vi.waitFor(() => {
      expect(onWaiting).toHaveBeenCalledOnce();
    });
    expect(acquired).toBe(false);

    release();
    await waiting;
    expect(acquired).toBe(true);
    const { held } = await navigator.locks.query();
    expect(held?.some((lock) => lock.name === 'held')).toBe(true);
  });
});
