import type { Id } from '@tdl/domain';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { authHeaders, type Auth } from './auth.ts';
import type { Db } from './db/client.ts';
import { revokedSessions } from './db/schema.ts';
import { sendError } from './errors.ts';
import { hashToken, presentedToken } from './session-token.ts';

export interface SessionInfo {
  userId: Id;
  sessionId: Id;
  /** sha256 of the raw session token, as stored in `revoked_sessions`. */
  tokenHash: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    sessionInfo?: SessionInfo;
  }
}

/** The session the request belongs to, read with Better Auth (no cookie cache). The caller is the authenticated user. */
export function sessionOf(request: FastifyRequest): SessionInfo {
  if (request.sessionInfo === undefined) throw new Error('route is missing the requireSession preHandler');
  return request.sessionInfo;
}

export type SessionCheckResult = { ok: true; info: SessionInfo; cookies: string[] } | { ok: false; code: 'session-revoked' | 'session-expired' };

/**
 * Builds the session check: the session that request headers present, read with Better Auth (no
 * cookie cache). With no valid session, the code is `session-revoked` if the presented token was
 * revoked (it has a tombstone), otherwise `session-expired`.
 */
export function createSessionCheck(auth: Auth, db: Db) {
  return async function checkSession(headers: Headers): Promise<SessionCheckResult> {
    const result = await auth.api.getSession({ headers, query: { disableCookieCache: true }, returnHeaders: true });
    const session = result.response?.session;
    if (session === undefined) {
      const token = presentedToken(headers);
      const revoked =
        token !== null &&
        (await db.select({ tokenHash: revokedSessions.tokenHash }).from(revokedSessions).where(eq(revokedSessions.tokenHash, hashToken(token)))).length > 0;
      return { ok: false, code: revoked ? 'session-revoked' : 'session-expired' };
    }
    // A refreshed session (see `updateAge`) comes with a new cookie expiry.
    return { ok: true, info: { userId: session.userId, sessionId: session.id, tokenHash: hashToken(session.token) }, cookies: result.headers.getSetCookie() };
  };
}

export type CheckSession = ReturnType<typeof createSessionCheck>;

/** Builds the `requireSession` preHandler, which answers 401 with the check's code when there's no valid session. */
export function createSessionGuard(checkSession: CheckSession) {
  return async function requireSession(request: FastifyRequest, reply: FastifyReply): Promise<SessionInfo | undefined> {
    const result = await checkSession(authHeaders(request));
    if (!result.ok) {
      await sendError(reply, 401, result.code);
      return undefined;
    }
    if (result.cookies.length > 0) void reply.header('set-cookie', result.cookies);
    request.sessionInfo = result.info;
    return result.info;
  };
}

export type RequireSession = ReturnType<typeof createSessionGuard>;
