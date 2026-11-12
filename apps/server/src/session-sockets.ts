import type { Id } from '@tdl/domain';

/** Anything that can be closed with a websocket close code. */
export interface Closable {
  close(code: number): void;
}

/** Tracks the open sockets of each session, so revoking a session can close them. */
export interface SessionSockets {
  /** Returns a function that stops tracking the socket. */
  track(sessionId: Id, socket: Closable): () => void;
  /** Closes every open socket of the session with `code`. */
  close(sessionId: Id, code: number): void;
}

export function createSessionSockets(): SessionSockets {
  const open = new Map<Id, Set<Closable>>();
  return {
    track(sessionId, socket) {
      const sockets = open.get(sessionId) ?? new Set<Closable>();
      open.set(sessionId, sockets.add(socket));
      return () => {
        sockets.delete(socket);
        if (sockets.size === 0) open.delete(sessionId);
      };
    },
    close(sessionId, code) {
      for (const socket of [...(open.get(sessionId) ?? [])]) socket.close(code);
    },
  };
}
