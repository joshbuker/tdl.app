import type { Id } from '@tdl/domain';
import { gt, max, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { feed } from '../db/schema.ts';
import { lockFeedWrites, type Tx } from './apply.ts';
import type { Notifier } from './notifier.ts';

/** Runs `work` in a transaction that may write operations or the feed; after it commits, tells each user whose feed grew. */
export type FeedTransaction = <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;

/**
 * The only way to open a transaction that calls `applyOperation`. It takes the feed-write lock
 * first, so every feed row above the mark it reads is this transaction's own, and notifies only
 * once the commit has made those rows visible to pulls. A rolled-back transaction notifies no one.
 */
export function createFeedTransaction(db: Db, notifier: Notifier): FeedTransaction {
  return async (work) => {
    let grown: { userId: Id; feedId: number }[] = [];
    const result = await db.transaction(async (tx) => {
      await lockFeedWrites(tx);
      const mark = await highestFeedId(tx);
      const value = await work(tx);
      grown = await highestFeedIdsAbove(tx, mark);
      return value;
    });
    for (const { userId, feedId } of grown) notifier.notify(userId, feedId);
    return result;
  };
}

async function highestFeedId(tx: Tx): Promise<number> {
  const [row] = await tx.select({ id: sql<number>`coalesce(max(${feed.id}), 0)`.mapWith(Number) }).from(feed);
  return row?.id ?? 0;
}

/** Each user with feed rows above `mark`, and their highest. */
async function highestFeedIdsAbove(tx: Tx, mark: number): Promise<{ userId: Id; feedId: number }[]> {
  const rows = await tx
    .select({ userId: feed.userId, feedId: max(feed.id) })
    .from(feed)
    .where(gt(feed.id, mark))
    .groupBy(feed.userId);
  return rows.flatMap((row) => (row.feedId === null ? [] : [{ userId: row.userId, feedId: row.feedId }]));
}
