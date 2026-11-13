import type { Id } from '@tdl/domain';
import type { FeedEntry } from '@tdl/sync';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { feed, lists, operations, user } from '../src/db/schema.ts';
import { auth, signUp } from './auth-helpers.ts';
import { testApp } from './db.ts';

describe('GET /api/me', () => {
  let server: Awaited<ReturnType<typeof testApp>>;

  beforeAll(async () => {
    server = await testApp();
  });
  afterAll(async () => {
    await server.close();
  });

  const me = async (token: string) => {
    const response = await server.app.inject({ url: '/api/me', headers: auth(token) });
    expect(response.statusCode).toBe(200);
    return response.json<{ userId: Id; defaultListId: Id }>();
  };

  test('repairs a missing Inbox once, even when asked twice at the same time', async () => {
    const token = await signUp(server.app, 'Mia');
    const { userId } = await me(token);
    // A crash between Better Auth's commit and the Inbox's creation leaves no Inbox and no default list.
    await server.db.update(user).set({ defaultListId: null }).where(eq(user.id, userId));
    await server.db.delete(feed).where(eq(feed.userId, userId));
    await server.db.delete(operations).where(eq(operations.authorId, userId));
    await server.db.delete(lists).where(eq(lists.ownerId, userId));
    expect(await inboxIds(token)).toEqual([]);

    const [first, second] = await Promise.all([me(token), me(token)]);
    expect(first.defaultListId).not.toBeNull();
    expect(second.defaultListId).toBe(first.defaultListId);
    expect(await inboxIds(token)).toEqual([first.defaultListId]);
    expect((await me(token)).defaultListId).toBe(first.defaultListId);
  });

  async function inboxIds(token: string): Promise<Id[]> {
    const response = await server.app.inject({ url: '/api/sync/pull?after=0', headers: auth(token) });
    const { entries } = response.json<{ entries: FeedEntry[] }>();
    return entries.flatMap((e) => (e.kind === 'op' && e.op.record.type === 'list' && e.op.content?.field === 'title' && e.op.content.value === 'Inbox' ? [e.op.record.id] : []));
  }
});
