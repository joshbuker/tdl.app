import type { Id } from '@tdl/domain';
import type { FeedNotification } from '@tdl/sync';
import { getSessionCookie } from 'better-auth/cookies';
import { fromNodeHeaders } from 'better-auth/node';
import { eq, max } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RawData, WebSocket } from 'ws';
import { z } from 'zod';
import { CLIENT_IP_HEADER } from '../auth.ts';
import type { Db } from '../db/client.ts';
import { feed, revokedSessions, session } from '../db/schema.ts';
import { sendError } from '../errors.ts';
import type { RequireProtocol } from '../protocol.ts';
import type { CheckSession, RequireSession, SessionInfo } from '../session-guard.ts';
import { SESSION_REVOKED_CLOSE, WS_AUTH_FAILED_CLOSE, WS_TRY_AGAIN_LATER_CLOSE, type SessionSockets } from '../session-sockets.ts';
import type { Notifier } from '../sync/notifier.ts';

/** How long a socket opened without a cookie has to send its auth message. */
export const WS_AUTH_TIMEOUT_MS = 5000;
/** The most sockets one client address may have waiting for their auth message. */
export const MAX_UNAUTHENTICATED_PER_ADDRESS = 10;
/** How often an open socket's session is checked again. */
export const WS_RECHECK_MS = 30 * 60 * 1000;
/** The close code for a failure of the server's own, e.g. its database. The device reconnects. */
const INTERNAL_ERROR_CLOSE = 1011;

// Tokens are visible ASCII; anything else couldn't go in a header, where the session check reads it.
const authMessageSchema = z.object({ type: z.literal('auth'), token: z.string().regex(/^[\x21-\x7e]+$/) });

export interface SyncWsDeps {
  db: Db;
  notifier: Notifier;
  sockets: SessionSockets;
  /** The app's own origin; the only `Origin` a cookie connection may come from. */
  origin: string;
  /** The native apps' origins, which may connect with a token but never with a cookie. */
  appOrigins: string[];
  checkSession: CheckSession;
  now: () => number;
}

/**
 * `GET /api/sync/ws`: tells the device its latest feed ID once authenticated, then again whenever
 * its feed grows. The web app authenticates with its session cookie at the handshake; every other
 * client opens the socket without credentials and sends `{ type: 'auth', token }` first (see
 * docs/design-decisions/live-update-authentication.md). Bad protocol versions, origins and cookie
 * sessions are refused before upgrading.
 */
export function registerSyncWsRoutes(app: FastifyInstance, deps: SyncWsDeps, requireProtocol: RequireProtocol, requireSession: RequireSession): void {
  const waiting = createAddressCounter();

  /** Starts telling an authenticated socket about its feed, until it closes or its session ends. */
  const goLive = async (socket: WebSocket, info: SessionInfo): Promise<void> => {
    const send = (id: number) => {
      const message: FeedNotification = { type: 'feed', id };
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };
    const recheck = setInterval(() => {
      void sessionEnd(deps, info).then(
        (code) => {
          if (code !== null) socket.close(code);
        },
        () => undefined, // The database is unavailable: check again next time.
      );
    }, WS_RECHECK_MS);
    recheck.unref();
    // Listening before reading the latest ID, so no growth in between is missed.
    stopOnClose(socket, [
      deps.notifier.subscribe(info.userId, send),
      deps.sockets.track(info.sessionId, socket),
      () => {
        clearInterval(recheck);
      },
    ]);
    send(await latestFeedId(deps.db, info.userId));
  };

  /** Waits for a socket opened without a cookie to send a valid token, sending it nothing until then. */
  const awaitToken = (socket: WebSocket, address: string): void => {
    if (!waiting.add(address)) {
      socket.close(WS_TRY_AGAIN_LATER_CLOSE);
      return;
    }
    let state: 'waiting' | 'checking' | 'live' | 'ended' = 'waiting';
    /** Leaves the waiting state, freeing the address's place. */
    const settle = (next: 'live' | 'ended') => {
      if (state === 'waiting' || state === 'checking') {
        waiting.remove(address);
        clearTimeout(timeout);
      }
      state = next;
    };
    const fail = (code = WS_AUTH_FAILED_CLOSE) => {
      settle('ended');
      socket.close(code);
    };
    const timeout = setTimeout(() => {
      fail(WS_TRY_AGAIN_LATER_CLOSE);
    }, WS_AUTH_TIMEOUT_MS);
    timeout.unref();
    socket.on('close', () => {
      if (state !== 'live') settle('ended');
    });

    socket.on('message', (data: RawData) => {
      // Once live, nothing a device sends is read. Message contents are never logged.
      if (state === 'live') return;
      const token = state === 'waiting' ? authToken(data) : null;
      if (token === null) {
        fail();
        return;
      }
      state = 'checking';
      deps
        .checkSession(new Headers({ authorization: `Bearer ${token}`, [CLIENT_IP_HEADER]: address }))
        .then(async (result) => {
          if (state !== 'checking') return; // Closed or timed out meanwhile.
          if (!result.ok) {
            fail();
            return;
          }
          settle('live');
          await goLive(socket, result.info);
        })
        .catch(() => {
          fail(INTERNAL_ERROR_CLOSE);
        });
    });
  };

  app.get(
    '/sync/ws',
    { websocket: true, onRequest: requireProtocol.query, preValidation: handshake(deps, requireSession) },
    async (socket, request) => {
      if (request.sessionInfo === undefined) awaitToken(socket, request.ip);
      else await goLive(socket, request.sessionInfo);
    },
  );
}

/**
 * Checks the handshake. A cookie connection must come from our own origin, since browsers send
 * cookies cross-site, and its session must be valid. A connection without one opens unauthenticated,
 * from our origin, an app origin, or none (native clients). The `Authorization` header isn't read.
 */
function handshake(deps: SyncWsDeps, requireSession: RequireSession) {
  const ours = new URL(deps.origin).origin;
  const allowed = new Set([ours, ...deps.appOrigins]);
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    delete request.headers.authorization;
    const theirs = request.headers.origin;
    if (getSessionCookie(fromNodeHeaders(request.headers)) !== null) {
      if (theirs !== ours) await sendError(reply, 403, 'forbidden');
      else await requireSession(request, reply);
    } else if (theirs !== undefined && !allowed.has(theirs)) {
      await sendError(reply, 403, 'forbidden');
    }
  };
}

/** The token in an auth message; null for anything else. */
function authToken(data: RawData): string | null {
  try {
    const parsed = authMessageSchema.safeParse(JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : ''));
    return parsed.success ? parsed.data.token : null;
  } catch {
    return null;
  }
}

/** The close code for a session that has ended: 4401 if it was revoked, 4403 otherwise. Null while it lasts. */
async function sessionEnd({ db, now }: SyncWsDeps, info: SessionInfo): Promise<number | null> {
  const [row] = await db.select({ expiresAt: session.expiresAt }).from(session).where(eq(session.id, info.sessionId));
  if (row !== undefined && row.expiresAt.getTime() > now()) return null;
  if (row !== undefined) return WS_AUTH_FAILED_CLOSE;
  const tombstones = await db.select({ tokenHash: revokedSessions.tokenHash }).from(revokedSessions).where(eq(revokedSessions.tokenHash, info.tokenHash));
  return tombstones.length > 0 ? SESSION_REVOKED_CLOSE : WS_AUTH_FAILED_CLOSE;
}

/** Counts sockets per client address, up to MAX_UNAUTHENTICATED_PER_ADDRESS. */
function createAddressCounter() {
  const counts = new Map<string, number>();
  return {
    /** Counts one more for `address`; false if it is already at the limit. */
    add(address: string): boolean {
      const count = counts.get(address) ?? 0;
      if (count >= MAX_UNAUTHENTICATED_PER_ADDRESS) return false;
      counts.set(address, count + 1);
      return true;
    },
    remove(address: string): void {
      const count = (counts.get(address) ?? 0) - 1;
      if (count > 0) counts.set(address, count);
      else counts.delete(address);
    },
  };
}

function stopOnClose(socket: WebSocket, stops: (() => void)[]): void {
  socket.on('close', () => {
    for (const stop of stops) stop();
  });
}

async function latestFeedId(db: Db, userId: Id): Promise<number> {
  const [row] = await db.select({ id: max(feed.id) }).from(feed).where(eq(feed.userId, userId));
  return row?.id ?? 0;
}
