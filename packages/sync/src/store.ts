import type { FieldError, Id } from '@tdl/domain';
import type { FeedEntry, Operation, PushResult, RecordRef } from './operations.ts';

/** A confirmed operation, as it came from the feed. */
export type FeedOp = Extract<FeedEntry, { kind: 'op' }>['op'];

/** An operation the server refused, kept for the "couldn't sync" view. `at` is an ISO instant. */
export interface RejectedOp {
  op: Operation;
  code: Extract<PushResult, { status: 'rejected' }>['code'];
  errors?: FieldError[];
  at: string;
}

export interface StoredReplica {
  userId: Id;
  deviceId: string;
  /** The last feed ID applied. */
  cursor: number;
  confirmed: FeedOp[];
  /** In the order they were made. */
  pending: Operation[];
  rejected: RejectedOp[];
}

/** Durable storage for one device's replica. Platforms implement it over their own storage. */
export interface ReplicaStore {
  /** The stored replica, or null if there is none (never initialized, or wiped). */
  load(): Promise<StoredReplica | null>;
  /** Starts an empty replica for this user and device, replacing anything stored. */
  init(userId: Id, deviceId: string): Promise<void>;
  /** Adds operations not already stored (by ID), and sets the cursor. */
  appendConfirmed(ops: FeedOp[], cursor: number): Promise<void>;
  /** Drops the record's confirmed operations (see `forgetOps`), and sets the cursor. */
  forget(record: RecordRef, cursor: number): Promise<void>;
  /** Appends a pending operation. */
  putPending(op: Operation): Promise<void>;
  removePending(id: Id): Promise<void>;
  putRejected(rejected: RejectedOp): Promise<void>;
  /** Removes a rejected operation by its operation ID. */
  removeRejected(id: Id): Promise<void>;
  /** Deletes everything, so `load` returns null. */
  wipe(): Promise<void>;
}

/**
 * The operations left after forgetting a record: its own operations go, and for a task, so do
 * the operations of every link whose createLink names it.
 */
export function forgetOps<T extends Operation>(ops: readonly T[], record: RecordRef): T[] {
  const links = new Set<Id>();
  if (record.type === 'task') {
    for (const op of ops) {
      const meta = op.meta;
      if (meta?.kind === 'createLink' && (meta.prerequisiteId === record.id || meta.postrequisiteId === record.id)) {
        links.add(op.record.id);
      }
    }
  }
  return ops.filter(
    (op) =>
      !(op.record.type === record.type && op.record.id === record.id) &&
      !(op.record.type === 'link' && links.has(op.record.id)),
  );
}

const copy = (data: StoredReplica): StoredReplica => ({
  ...data,
  confirmed: [...data.confirmed],
  pending: [...data.pending],
  rejected: [...data.rejected],
});

/** A ReplicaStore in memory, for tests and headless use. */
export class MemoryStore implements ReplicaStore {
  private data: StoredReplica | null = null;

  private get stored(): StoredReplica {
    if (this.data === null) throw new Error('store-not-initialized');
    return this.data;
  }

  load(): Promise<StoredReplica | null> {
    return Promise.resolve(this.data === null ? null : copy(this.data));
  }

  init(userId: Id, deviceId: string): Promise<void> {
    this.data = { userId, deviceId, cursor: 0, confirmed: [], pending: [], rejected: [] };
    return Promise.resolve();
  }

  appendConfirmed(ops: FeedOp[], cursor: number): Promise<void> {
    const data = this.stored;
    const known = new Set(data.confirmed.map((op) => op.id));
    for (const op of ops) {
      if (!known.has(op.id)) {
        known.add(op.id);
        data.confirmed.push(op);
      }
    }
    data.cursor = cursor;
    return Promise.resolve();
  }

  forget(record: RecordRef, cursor: number): Promise<void> {
    const data = this.stored;
    data.confirmed = forgetOps(data.confirmed, record);
    data.cursor = cursor;
    return Promise.resolve();
  }

  putPending(op: Operation): Promise<void> {
    this.stored.pending.push(op);
    return Promise.resolve();
  }

  removePending(id: Id): Promise<void> {
    const data = this.stored;
    data.pending = data.pending.filter((op) => op.id !== id);
    return Promise.resolve();
  }

  putRejected(rejected: RejectedOp): Promise<void> {
    this.stored.rejected.push(rejected);
    return Promise.resolve();
  }

  removeRejected(id: Id): Promise<void> {
    const data = this.stored;
    data.rejected = data.rejected.filter((r) => r.op.id !== id);
    return Promise.resolve();
  }

  wipe(): Promise<void> {
    this.data = null;
    return Promise.resolve();
  }
}
