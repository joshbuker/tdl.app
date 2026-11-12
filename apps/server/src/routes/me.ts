import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { user } from '../db/schema.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';

const meSchema = z.object({ userId: z.uuid(), username: z.string(), defaultListId: z.uuid().nullable() });

export function registerMeRoutes(app: FastifyInstance, db: Db, requireSession: RequireSession): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/me',
    { preHandler: requireSession, schema: { response: { 200: meSchema } } },
    async (request) => {
      const { userId } = sessionOf(request);
      const [row] = await db
        .select({ username: user.username, displayUsername: user.displayUsername, defaultListId: user.defaultListId })
        .from(user)
        .where(eq(user.id, userId));
      if (row === undefined) throw new Error('session user missing');
      // `username` is stored lowercased for case-insensitive uniqueness; `displayUsername` is what the user typed.
      return { userId, username: row.displayUsername ?? row.username ?? '', defaultListId: row.defaultListId };
    },
  );
}
