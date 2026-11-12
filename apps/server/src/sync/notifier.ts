import type { Id } from '@tdl/domain';

type Listener = (feedId: number) => void;

/** Tells this process's listeners that a user's feed grew. In-process only: several instances would need Postgres LISTEN/NOTIFY. */
export interface Notifier {
  /** Calls each of the user's listeners with their highest feed ID. */
  notify(userId: Id, feedId: number): void;
  /** Returns a function that removes the listener. */
  subscribe(userId: Id, listener: Listener): () => void;
}

export function createNotifier(): Notifier {
  const listeners = new Map<Id, Set<Listener>>();
  return {
    notify(userId, feedId) {
      for (const listener of listeners.get(userId) ?? []) listener(feedId);
    },
    subscribe(userId, listener) {
      const mine = listeners.get(userId) ?? new Set<Listener>();
      listeners.set(userId, mine.add(listener));
      return () => {
        mine.delete(listener);
        if (mine.size === 0) listeners.delete(userId);
      };
    },
  };
}
