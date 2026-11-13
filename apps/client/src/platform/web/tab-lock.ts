/** The Web Lock that one tab holds while it uses the device's database. */
const LOCK_NAME = 'tdl-app-database';

/**
 * Takes the database lock and holds it for the page's life. If another tab holds it, calls
 * `onWaiting`, then waits until that tab closes.
 */
export function acquireTabLock(onWaiting: () => void): Promise<void> {
  return holdTabLock(navigator.locks, LOCK_NAME, onWaiting);
}

/** `acquireTabLock`, with the lock manager and lock name given (for tests). */
export async function holdTabLock(
  locks: LockManager,
  name: string,
  onWaiting: () => void,
): Promise<void> {
  // The lock is released only when the page goes away.
  const forever = () => new Promise<never>(() => undefined);
  const taken = await new Promise<boolean>((resolve) => {
    void locks.request(name, { ifAvailable: true }, (lock) => {
      resolve(lock !== null);
      return lock === null ? undefined : forever();
    });
  });
  if (taken) return;

  onWaiting();
  await new Promise<void>((resolve) => {
    void locks.request(name, () => {
      resolve();
      return forever();
    });
  });
}
