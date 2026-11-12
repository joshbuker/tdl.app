import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { pullPageSchema, type FeedEntry, type Operation, type RecordRef } from '@tdl/sync';
import { and, asc, eq, gt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { feed, operations, session } from '../db/schema.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';

const pullQuerySchema = z.object({
  after: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export function registerSyncPullRoutes(app: FastifyInstance, db: Db, requireSession: RequireSession, now: () => number): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/sync/pull',
    { preHandler: requireSession, schema: { querystring: pullQuerySchema, response: { 200: pullPageSchema } } },
    async (request) => {
      const { userId, sessionId } = sessionOf(request);
      const { after, limit } = request.query;
      // One row past the page tells whether there's more.
      const rows = await db
        .select({
          id: feed.id,
          kind: feed.kind,
          recordType: feed.recordType,
          recordId: feed.recordId,
          op: {
            seq: operations.seq,
            id: operations.id,
            hlc: operations.hlc,
            meta: operations.meta,
            content: operations.content,
            authorId: operations.authorId,
          },
        })
        .from(feed)
        .leftJoin(operations, eq(operations.seq, feed.opSeq))
        .where(and(eq(feed.userId, userId), gt(feed.id, after)))
        .orderBy(asc(feed.id))
        .limit(limit + 1);
      await db.update(session).set({ lastSyncedAt: new Date(now()) }).where(eq(session.id, sessionId));

      const page = rows.slice(0, limit);
      const entries = page.map((row): FeedEntry => {
        const record = { type: row.recordType as RecordRef['type'], id: row.recordId };
        if (row.kind === 'forget') return { id: row.id, kind: 'forget', record };
        if (row.op === null) throw new Error(`feed row ${String(row.id)} has no operation`);
        const { meta, content, ...stored } = row.op;
        return {
          id: row.id,
          kind: 'op',
          op: { ...stored, record, meta: meta as Operation['meta'], content: content as Operation['content'] },
        };
      });
      return { entries, cursor: page.at(-1)?.id ?? after, more: rows.length > limit };
    },
  );
}
