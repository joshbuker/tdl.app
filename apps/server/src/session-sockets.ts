import type { Id } from '@tdl/domain';

/** The close code telling a device its session was revoked. */
export const SESSION_REVOKED_CLOSE = 4401;
/** The close code for a socket whose authentication failed, or whose session ended other than by revoking. */
export const WS_AUTH_FAILED_CLOSE = 4403;
/** The close code for a passing refusal (too many sockets waiting, or too slow to authenticate): the device reconnects later. */
export const WS_TRY_AGAIN_LATER_CLOSE = 1013;

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
