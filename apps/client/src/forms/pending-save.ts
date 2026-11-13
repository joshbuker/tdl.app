/** A save that waits for typing to pause, and can be made at once (e.g. when leaving the page). */
export interface PendingSave<T> {
  /** Replaces the pending value, and restarts the wait. */
  schedule(value: T): void;
  /** Saves the pending value now, if there is one. */
  flush(): Promise<void>;
}

/** Calls `save` with the last scheduled value, `delayMs` after the last `schedule`, or on `flush`. */
export function createPendingSave<T>(
  save: (value: T) => Promise<void>,
  delayMs: number,
): PendingSave<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (pending === null) return;
    const { value } = pending;
    pending = null;
    await save(value);
  };

  return {
    schedule(value) {
      pending = { value };
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    flush,
  };
}
