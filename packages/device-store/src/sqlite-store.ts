import { forgetOps, type FeedOp, type JsonValue, type Operation, type RecordRef, type RejectedOp, type ReplicaStore, type StoredReplica } from '@tdl/sync';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { confirmedOps, keyValue, pendingOps, rejectedOps, replica, unknownEntries } from './schema.ts';

type Query = BatchItem<'sqlite'>;

const rowid = sql`rowid`;

/** A feed entry's integer `id`, which every entry has (see `StoredReplica.unknown`). */
function entryId(entry: JsonValue): number {
  const id = typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? entry.id : undefined;
  if (typeof id !== 'number' || !Number.isInteger(id)) throw new Error('unknown-entry-without-id');
  return id;
}

/** The ReplicaStore every device uses, over its own SQLite database. */
export class SqliteReplicaStore implements ReplicaStore {
  private readonly db: SqliteRemoteDatabase;

  constructor(db: SqliteRemoteDatabase) {
    this.db = db;
  }

  /** Runs the queries in one transaction. */
  private async batch(queries: Query[]): Promise<void> {
    const [first, ...rest] = queries;
    if (first !== undefined) await this.db.batch([first, ...rest]);
  }

  private async requireInitialized(): Promise<void> {
    const row = await this.db.select({ userId: replica.userId }).from(replica).get();
    if (row === undefined) throw new Error('store-not-initialized');
  }

  private setCursor(cursor: number): Query {
    return this.db.update(replica).set({ cursor });
  }

  async load(): Promise<StoredReplica | null> {
    const [rows, confirmed, pending, rejected, unknown] = await this.db.batch([
      this.db.select().from(replica),
      this.db.select({ op: confirmedOps.op }).from(confirmedOps).orderBy(asc(rowid)),
      this.db.select({ op: pendingOps.op }).from(pendingOps).orderBy(asc(pendingOps.position)),
      this.db.select({ rejected: rejectedOps.rejected }).from(rejectedOps).orderBy(asc(rowid)),
      this.db.select({ raw: unknownEntries.raw }).from(unknownEntries).orderBy(asc(unknownEntries.feedId)),
    ]);
    const row = rows[0];
    if (row === undefined) return null;
    return {
      userId: row.userId,
      deviceId: row.deviceId,
      cursor: row.cursor,
      confirmed: confirmed.map((r) => JSON.parse(r.op) as FeedOp),
      pending: pending.map((r) => JSON.parse(r.op) as Operation),
      rejected: rejected.map((r) => JSON.parse(r.rejected) as RejectedOp),
      unknown: unknown.map((r) => JSON.parse(r.raw) as JsonValue),
    };
  }

  async init(userId: string, deviceId: string): Promise<void> {
    await this.batch([...this.clearReplica(), this.db.insert(replica).values({ userId, deviceId, cursor: 0 })]);
  }

  async appendConfirmed(ops: FeedOp[], cursor: number): Promise<void> {
    await this.requireInitialized();
    await this.batch([
      ...ops.map((op) => this.db.insert(confirmedOps).values({ id: op.id, op: JSON.stringify(op) }).onConflictDoNothing()),
      this.setCursor(cursor),
    ]);
  }

  async forget(record: RecordRef, cursor: number): Promise<void> {
    await this.requireInitialized();
    const stored = (await this.db.select({ op: confirmedOps.op }).from(confirmedOps)).map((r) => JSON.parse(r.op) as FeedOp);
    const kept = new Set(forgetOps(stored, record).map((op) => op.id));
    const dropped = stored.filter((op) => !kept.has(op.id)).map((op) => op.id);
    await this.batch([
      ...dropped.map((id) => this.db.delete(confirmedOps).where(eq(confirmedOps.id, id))),
      this.setCursor(cursor),
    ]);
  }

  async putUnknown(entries: JsonValue[], cursor: number): Promise<void> {
    await this.requireInitialized();
    await this.batch([
      ...entries.map((raw) => this.db.insert(unknownEntries).values({ feedId: entryId(raw), raw: JSON.stringify(raw) }).onConflictDoNothing()),
      this.setCursor(cursor),
    ]);
  }

  async removeUnknown(ids: number[]): Promise<void> {
    await this.requireInitialized();
    if (ids.length > 0) await this.db.delete(unknownEntries).where(inArray(unknownEntries.feedId, ids));
  }

  async putPending(op: Operation): Promise<void> {
    await this.requireInitialized();
    await this.db.insert(pendingOps).values({ id: op.id, op: JSON.stringify(op) });
  }

  async removePending(id: string): Promise<void> {
    await this.requireInitialized();
    await this.db.delete(pendingOps).where(eq(pendingOps.id, id));
  }

  async putRejected(rejected: RejectedOp): Promise<void> {
    await this.requireInitialized();
    await this.db
      .insert(rejectedOps)
      .values({ opId: rejected.op.id, rejected: JSON.stringify(rejected) })
      .onConflictDoUpdate({ target: rejectedOps.opId, set: { rejected: JSON.stringify(rejected) } });
  }

  async removeRejected(id: string): Promise<void> {
    await this.requireInitialized();
    await this.db.delete(rejectedOps).where(eq(rejectedOps.opId, id));
  }

  /** Deletes the replica and the key-value store. */
  async wipe(): Promise<void> {
    await this.batch([...this.clearReplica(), this.db.delete(keyValue)]);
  }

  private clearReplica(): Query[] {
    return [replica, confirmedOps, pendingOps, rejectedOps, unknownEntries].map((table) => this.db.delete(table));
  }
}
