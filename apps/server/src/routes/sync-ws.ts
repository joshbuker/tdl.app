import type { Id } from '@tdl/domain';
import type { FeedNotification } from '@tdl/sync';
import { eq, max } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import type { Db } from '../db/client.ts';
import { feed } from '../db/schema.ts';
import { sendError } from '../errors.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';
import type { SessionSockets } from '../session-sockets.ts';
import type { Notifier } from '../sync/notifier.ts';

export interface SyncWsDeps {
  db: Db;
  notifier: Notifier;
  sockets: SessionSockets;
  /** The app's own origin; the only `Origin` a browser may connect from. */
  origin: string;
}

/**
 * `GET /api/sync/ws`: tells the device its latest feed ID on connect, then again whenever its feed
 * grows. Incoming messages are ignored. Bad origins and sessions are refused before upgrading.
 */
export function registerSyncWsRoutes(app: FastifyInstance, deps: SyncWsDeps, requireSession: RequireSession): void {
  app.get('/sync/ws', { websocket: true, preValidation: [sameOrigin(deps.origin), requireSession] }, async (socket, request) => {
    const { userId, sessionId } = sessionOf(request);
    const send = (id: number) => {
      const message: FeedNotification = { type: 'feed', id };
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };
    // Listening before reading the latest ID, so no growth in between is missed.
    stopOnClose(socket, [deps.notifier.subscribe(userId, send), deps.sockets.track(sessionId, socket)]);
    send(await latestFeedId(deps.db, userId));
  });
}

/** Cookies are sent cross-site, so a browser's `Origin` must be ours. Native apps send none. */
function sameOrigin(origin: string) {
  const ours = new URL(origin).origin;
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const theirs = request.headers.origin;
    if (theirs !== undefined && theirs !== ours) await sendError(reply, 403, 'forbidden');
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
