import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { validateField, type FieldError } from '@tdl/domain';
import { pushRequestSchema, pushResponseSchema, type Operation, type PushResult } from '@tdl/sync';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/client.ts';
import { links, operations } from '../db/schema.ts';
import { sessionOf, type RequireSession, type SessionInfo } from '../session-guard.ts';
import { loadAccess } from '../sync/access-loader.ts';
import { applyOperation } from '../sync/apply.ts';
import { authorize, shapeErrors } from '../sync/authorize.ts';
import type { FeedTransaction } from '../sync/feed-transaction.ts';

const LINK_PAIR_CONSTRAINT = 'links_prerequisite_id_postrequisite_id_unique';
// A unique violation means a concurrent push won a race; deciding again sees what it wrote.
const MAX_ATTEMPTS = 3;

export interface PushDeps {
  db: Db;
  feedTransaction: FeedTransaction;
  now: () => number;
}

export function registerSyncPushRoutes(app: FastifyInstance, deps: PushDeps, requireSession: RequireSession): void {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sync/push',
    { preHandler: requireSession, schema: { body: pushRequestSchema, response: { 200: pushResponseSchema } } },
    async (request) => {
      const session = sessionOf(request);
      const results: PushResult[] = [];
      // In order, each in its own transaction: a rejected operation never aborts the others.
      for (const op of request.body.ops) results.push(await pushOne(deps, op, session));
      return { results };
    },
  );
}

async function pushOne({ db, feedTransaction, now }: PushDeps, op: Operation, session: SessionInfo): Promise<PushResult> {
  for (let attempt = 1; ; attempt++) {
    const prior = await priorResult(db, op, session);
    if (prior !== null) return prior;

    const shape = shapeErrors(op);
    if (shape.length > 0) return rejected(op, 'invalid', { errors: shape });

    try {
      return await feedTransaction(async (tx): Promise<PushResult> => {
        const loaded = await loadAccess(tx, op);
        const decision = authorize(loaded, session.userId, op);
        if (decision !== 'ok') return rejected(op, decision);
        const errors = validateContent(op);
        if (errors.length > 0) return rejected(op, 'invalid', { errors });
        const seq = await applyOperation(tx, op, { userId: session.userId, sessionId: session.sessionId }, now, loaded);
        return { id: op.id, status: 'accepted', seq };
      });
    } catch (error) {
      // The transaction has rolled back, so nothing of this operation remains.
      const constraint = uniqueViolation(error);
      if (constraint === null || attempt >= MAX_ATTEMPTS) throw error;
      if (constraint === LINK_PAIR_CONSTRAINT && op.meta?.kind === 'createLink') {
        const [existing] = await db
          .select({ id: links.id })
          .from(links)
          .where(and(eq(links.prerequisiteId, op.meta.prerequisiteId), eq(links.postrequisiteId, op.meta.postrequisiteId)));
        if (existing !== undefined) return rejected(op, 'duplicate-link', { existingLinkId: existing.id });
      }
      // Otherwise the same operation, or a record with the same ID, was stored concurrently: decide again.
    }
  }
}

/** An operation ID already stored: the original result for its author, and `forbidden` for anyone else. */
async function priorResult(db: Db, op: Operation, session: SessionInfo): Promise<PushResult | null> {
  const [stored] = await db.select({ seq: operations.seq, authorId: operations.authorId }).from(operations).where(eq(operations.id, op.id));
  if (stored === undefined) return null;
  return stored.authorId === session.userId ? { id: op.id, status: 'accepted', seq: stored.seq } : rejected(op, 'forbidden');
}

/** The isolated content-validation step (v2 encrypts content and drops it). */
function validateContent(op: Operation): FieldError[] {
  if (op.content === null || op.record.type === 'grant') return [];
  const result = validateField(op.record.type, op.content.field, op.content.value);
  return result.ok ? [] : result.errors;
}

function rejected(
  op: Operation,
  code: 'not-found' | 'forbidden' | 'invalid' | 'duplicate-link',
  extra: { errors?: FieldError[]; existingLinkId?: string } = {},
): PushResult {
  return { id: op.id, status: 'rejected', code, ...extra };
}

/** The constraint a Postgres unique violation (23505) names, found through the error's causes; null for any other error. */
function uniqueViolation(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const { code, constraint, cause } = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (code === '23505') return typeof constraint === 'string' ? constraint : '';
    current = cause;
  }
  return null;
}
