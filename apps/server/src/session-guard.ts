import { createHash } from 'node:crypto';
import type { Id } from '@tdl/domain';
import { getSessionCookie } from 'better-auth/cookies';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { authHeaders, type Auth } from './auth.ts';
import type { Db } from './db/client.ts';
import { revokedSessions } from './db/schema.ts';
import { sendError } from './errors.ts';

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

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The raw session token a request presents: the bearer value, else the session cookie. Both may be
 * signed as `token.signature`; the raw token is the part before the first `.`.
 */
export function presentedToken(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  let value: string | null = null;
  if (authorization !== null && authorization.slice(0, 7).toLowerCase() === 'bearer ') value = authorization.slice(7).trim();
  value ??= getSessionCookie(headers);
  if (value === null || value === '') return null;
  const token = decode(value).split('.')[0] ?? '';
  return token === '' ? null : token;
}

/** The session the request belongs to, read with Better Auth (no cookie cache). The caller is the authenticated user. */
export function sessionOf(request: FastifyRequest): SessionInfo {
  if (request.sessionInfo === undefined) throw new Error('route is missing the requireSession preHandler');
  return request.sessionInfo;
}

/**
 * Builds the `requireSession` preHandler. With no valid session it answers 401 `session-revoked`
 * if the presented token was revoked (it has a tombstone), otherwise 401 `session-expired`.
 */
export function createSessionGuard(auth: Auth, db: Db) {
  return async function requireSession(request: FastifyRequest, reply: FastifyReply): Promise<SessionInfo | undefined> {
    const headers = authHeaders(request);
    const result = await auth.api.getSession({ headers, query: { disableCookieCache: true }, returnHeaders: true });
    // A refreshed session (see `updateAge`) comes with a new cookie expiry.
    const cookies = result.headers.getSetCookie();
    if (cookies.length > 0) void reply.header('set-cookie', cookies);

    const session = result.response?.session;
    if (session === undefined) {
      const token = presentedToken(headers);
      const revoked =
        token !== null &&
        (await db.select({ tokenHash: revokedSessions.tokenHash }).from(revokedSessions).where(eq(revokedSessions.tokenHash, hashToken(token)))).length > 0;
      await sendError(reply, 401, revoked ? 'session-revoked' : 'session-expired');
      return undefined;
    }

    const info: SessionInfo = { userId: session.userId, sessionId: session.id, tokenHash: hashToken(session.token) };
    request.sessionInfo = info;
    return info;
  };
}

export type RequireSession = ReturnType<typeof createSessionGuard>;
