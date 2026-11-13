import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPendingSave } from './pending-save.ts';

describe('createPendingSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('saves the last value once typing pauses', () => {
    const save = vi.fn(() => Promise.resolve());
    const pending = createPendingSave(save, 1000);
    pending.schedule('a');
    vi.advanceTimersByTime(600);
    pending.schedule('ab');
    vi.advanceTimersByTime(999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
  });

  test('flush saves a pending value at once, and only once', async () => {
    const save = vi.fn(() => Promise.resolve());
    const pending = createPendingSave(save, 1000);
    pending.schedule('ab');
    await pending.flush();
    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
    vi.advanceTimersByTime(1000);
    await pending.flush();
    expect(save).toHaveBeenCalledOnce();
  });

  test('flush with nothing pending saves nothing', async () => {
    const save = vi.fn(() => Promise.resolve());
    await createPendingSave(save, 1000).flush();
    expect(save).not.toHaveBeenCalled();
  });

  test('a save that fails is logged, not left unhandled', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('store-failed');
    const pending = createPendingSave(() => Promise.reject(failure), 1000);
    pending.schedule('a');
    await vi.advanceTimersByTimeAsync(1000);
    expect(error).toHaveBeenCalledExactlyOnceWith(failure);
    error.mockRestore();
  });
});
