import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ensureInbox, type AuthDeps } from '../auth.ts';
import { user } from '../db/schema.ts';
import { sessionOf, type RequireSession } from '../session-guard.ts';

const meSchema = z.object({ userId: z.uuid(), username: z.string(), defaultListId: z.uuid() });

export function registerMeRoutes(app: FastifyInstance, deps: AuthDeps, requireSession: RequireSession): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/me',
    { preHandler: requireSession, schema: { response: { 200: meSchema } } },
    async (request) => {
      const { db } = deps;
      const { userId } = sessionOf(request);
      const [row] = await db
        .select({ username: user.username, displayUsername: user.displayUsername, defaultListId: user.defaultListId })
        .from(user)
        .where(eq(user.id, userId));
      if (row === undefined) throw new Error('session user missing');
      // `username` is stored lowercased for case-insensitive uniqueness; `displayUsername` is what the user typed.
      const defaultListId = row.defaultListId ?? (await ensureInbox(deps, userId));
      return { userId, username: row.displayUsername ?? row.username ?? '', defaultListId };
    },
  );
}
