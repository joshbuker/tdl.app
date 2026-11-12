import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { newId, type Id } from '@tdl/domain';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { grants } from '../db/schema.ts';
import { sendError } from '../errors.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';
import { mayRemoveGrant } from '../sharing/rules.ts';
import { collectTarget } from '../sync/access-loader.ts';
import { writeServerOps, type Tx } from '../sync/apply.ts';

export function registerGrantRoutes(app: FastifyInstance, db: Db, requireSession: RequireSession, now: () => number): void {
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/grants/:id',
    { preHandler: requireSession, schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { userId } = sessionOf(request);
      const removed = await db.transaction((tx) => removeGrant(tx, userId, request.params.id, now));
      return removed ? reply.code(204).send() : sendError(reply, 404, 'not-found');
    },
  );
}

/**
 * Revokes the grant, through a `revokeGrant` operation authored by the user, if they are its
 * grantee (leaving) or its target's owner (removing a collaborator). Returns false, changing
 * nothing, for anyone else, or a grant that doesn't exist.
 */
async function removeGrant(tx: Tx, userId: Id, id: string, now: () => number): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  // Locked, so a concurrent removal of the same grant waits, then finds it gone.
  const [grant] = await tx.select().from(grants).where(eq(grants.id, id)).for('update');
  if (grant === undefined) return false;
  const target = { kind: grant.targetKind as 'list' | 'task', id: grant.targetId };
  if (!mayRemoveGrant(await collectTarget(tx, target), userId, { userId: grant.userId, target })) return false;

  await writeServerOps(tx, userId, [{ id: newId(), record: { type: 'grant', id }, meta: { kind: 'revokeGrant' }, content: null }], now);
  return true;
}
