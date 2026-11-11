import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authHeaders, type Auth } from '../auth.ts';
import type { Db } from '../db/client.ts';
import { revokedSessions, session } from '../db/schema.ts';
import { sendError } from '../errors.ts';
import { hashToken, sessionOf, type RequireSession } from '../session-guard.ts';

const sessionViewSchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastSyncedAt: z.iso.datetime().nullable(),
  current: z.boolean(),
});

export function registerSessionRoutes(app: FastifyInstance, db: Db, auth: Auth, requireSession: RequireSession): void {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/sessions',
    { preHandler: requireSession, schema: { response: { 200: z.array(sessionViewSchema) } } },
    async (request) => {
      const { userId, sessionId } = sessionOf(request);
      const rows = await db
        .select({ id: session.id, userAgent: session.userAgent, createdAt: session.createdAt, lastSyncedAt: session.lastSyncedAt })
        .from(session)
        .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
        .orderBy(asc(session.createdAt));
      return rows.map((row) => ({
        id: row.id,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString(),
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        current: row.id === sessionId,
      }));
    },
  );

  typed.delete('/sessions/:id', { preHandler: requireSession, schema: { params: z.object({ id: z.string() }) } }, async (request, reply) => {
    const { userId } = sessionOf(request);
    // Anything but one of the caller's own sessions is not found, including a malformed ID.
    const parsed = z.uuid().safeParse(request.params.id);
    const [target] = parsed.success
      ? await db
          .select({ token: session.token })
          .from(session)
          .where(and(eq(session.id, parsed.data), eq(session.userId, userId)))
      : [];
    if (target === undefined) return sendError(reply, 404, 'not-found');

    // The tombstone first, so the device learns it was revoked even though Better Auth deletes the session.
    await db.insert(revokedSessions).values({ tokenHash: hashToken(target.token), userId }).onConflictDoNothing();
    await auth.api.revokeSession({ headers: authHeaders(request), body: { token: target.token } });
    return reply.code(204).send();
  });
}
