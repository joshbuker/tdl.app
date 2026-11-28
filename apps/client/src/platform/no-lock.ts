/** Native apps run one instance, so there is no lock to take. */
export const noLock = (): Promise<void> => Promise.resolve();
