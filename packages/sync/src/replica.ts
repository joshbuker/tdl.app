import {
  buildGraph,
  can,
  canMoveTask,
  checkNewLink,
  listRole,
  newId as domainNewId,
  roleAllows,
  validateField,
  validateListInput,
  validateTaskInput,
  type FieldError,
  type Id,
  type LinkKind,
  type LinkRejection,
  type Validated,
} from '@tdl/domain';
import { createClock, type Clock } from './hlc.ts';
import type { ContentChange, MetaChange, Operation, PullPage, PushResult, RecordRef } from './operations.ts';
import { accessData, historyOf, materialize, type DeviceState, type HistoryEntry } from './state.ts';
import { forgetOps, type FeedOp, type RejectedOp, type ReplicaStore } from './store.ts';
import { NetworkError, SessionError, type Transport } from './transport.ts';

export type ReplicaStatus = 'ok' | 'offline' | 'logged-out' | 'revoked';

export interface ReplicaOptions {
  store: ReplicaStore;
  transport: Transport;
  userId: Id;
  deviceId: string;
  /** Milliseconds since the epoch. Defaults to Date.now. */
  now?: () => number;
  newId?: () => Id;
  /**
   * Receives errors from live syncs that are not network or session failures (a failing store,
   * or a bug). Defaults to rethrowing them as an unhandled rejection, so they are not hidden.
   */
  onError?: (error: unknown) => void;
}

const rethrow = (error: unknown): void => {
  // An unhandled rejection: ES has no queueMicrotask, and this package uses no platform globals.
  void Promise.reject(error instanceof Error ? error : new Error(String(error)));
};

const PUSH_BATCH = 500;
const PULL_LIMIT = 500;

const forbidden = (field: string): { ok: false; errors: FieldError[] } => ({ ok: false, errors: [{ field, code: 'forbidden' }] });
const done: Validated<void> = { ok: true, value: undefined };

/**
 * One device's copy of the user's data: confirmed operations from the feed, pending operations
 * in an outbox, and rejected ones. The state is always recomputed from confirmed and pending
 * operations. Edits apply at once; `sync` pushes the outbox and pulls the feed.
 */
export class Replica {
  private readonly store: ReplicaStore;
  private readonly transport: Transport;
  private readonly userId: Id;
  private readonly now: () => number;
  private readonly newId: () => Id;
  private readonly onError: (error: unknown) => void;
  private readonly clock: Clock;

  /** By operation ID, so a page pulled twice, or a pushed op echoed by the feed, appears once. */
  private confirmed = new Map<Id, FeedOp>();
  private outbox: Operation[] = [];
  private refused: RejectedOp[] = [];
  private cursor = 0;
  private current: DeviceState = materialize([]);
  private currentStatus: ReplicaStatus = 'ok';

  private running: Promise<void> | null = null;
  /** Counts sync requests, so a run can tell whether another came in while it ran. */
  private requests = 0;

  private constructor(options: ReplicaOptions) {
    this.store = options.store;
    this.transport = options.transport;
    this.userId = options.userId;
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? domainNewId;
    this.onError = options.onError ?? rethrow;
    this.clock = createClock(options.deviceId, this.now);
  }

  /** Opens the stored replica, or starts an empty one if none is stored for this user and device. */
  static async open(options: ReplicaOptions): Promise<Replica> {
    const replica = new Replica(options);
    const stored = await options.store.load();
    if (stored?.userId === options.userId && stored.deviceId === options.deviceId) {
      replica.cursor = stored.cursor;
      for (const op of stored.confirmed) replica.confirmed.set(op.id, op);
      replica.outbox = [...stored.pending];
      replica.refused = [...stored.rejected];
      for (const op of [...stored.confirmed, ...stored.pending, ...stored.rejected.map((r) => r.op)]) {
        replica.receive(op.hlc);
      }
      replica.recompute();
    } else {
      await options.store.init(options.userId, options.deviceId);
    }
    return replica;
  }

  // Reads

  state(): DeviceState {
    return this.current;
  }

  history(taskId: Id): HistoryEntry[] {
    return historyOf(this.merged(), taskId);
  }

  pending(): Operation[] {
    return [...this.outbox];
  }

  rejected(): RejectedOp[] {
    return [...this.refused];
  }

  status(): ReplicaStatus {
    return this.currentStatus;
  }

  // Local edits

  async createList(title: string): Promise<Validated<Id>> {
    const input = validateListInput({ title });
    if (!input.ok) return input;
    const id = this.newId();
    const record: RecordRef = { type: 'list', id };
    await this.emit([
      this.meta(record, { kind: 'createList' }),
      this.content(record, { field: 'title', value: input.value.title }),
    ]);
    return { ok: true, value: id };
  }

  async createTask(listId: Id, title: string, notes?: string): Promise<Validated<Id>> {
    const access = accessData(this.current);
    const list = this.current.lists.get(listId);
    const role = listRole(access, this.userId, listId);
    if (list === undefined || role === null || !roleAllows(role, 'addTask', 'list', list)) return forbidden('listId');
    const input = validateTaskInput(notes === undefined ? { title } : { title, notes });
    if (!input.ok) return input;
    const id = this.newId();
    const record: RecordRef = { type: 'task', id };
    const ops = [this.meta(record, { kind: 'createTask', listId }), this.content(record, { field: 'title', value: input.value.title })];
    if (input.value.notes !== '') ops.push(this.content(record, { field: 'notes', value: input.value.notes }));
    await this.emit(ops);
    return { ok: true, value: id };
  }

  async setTaskField(taskId: Id, field: 'title' | 'notes' | 'completedAt', value: unknown): Promise<Validated<void>> {
    if (!can(accessData(this.current), this.userId, 'edit', taskId)) return forbidden('taskId');
    const valid = validateField('task', field, value);
    if (!valid.ok) return valid;
    await this.emit([this.content({ type: 'task', id: taskId }, { field, value: valid.value as ContentChange['value'] })]);
    return done;
  }

  async moveTask(taskId: Id, listId: Id): Promise<Validated<void>> {
    if (!canMoveTask(accessData(this.current), this.userId, taskId, listId)) return forbidden('listId');
    await this.emit([this.meta({ type: 'task', id: taskId }, { kind: 'moveTask', listId })]);
    return done;
  }

  async addLink(
    prerequisiteId: Id,
    postrequisiteId: Id,
    kind: LinkKind = 'hard',
    reason = '',
  ): Promise<{ ok: true; id: Id } | { ok: false; rejection: LinkRejection }> {
    const access = accessData(this.current);
    const graph = buildGraph(this.current.tasks.values(), this.current.links.values());
    const check = checkNewLink(graph, prerequisiteId, postrequisiteId, (id) => can(access, this.userId, 'edit', id));
    if (!check.ok) return check;
    const id = this.newId();
    const record: RecordRef = { type: 'link', id };
    // Defaults ('hard', '') come from materialize, so only values the user chose are sent, and
    // folding into a duplicate link never overwrites a collaborator's values with defaults.
    const ops = [this.meta(record, { kind: 'createLink', prerequisiteId, postrequisiteId })];
    if (kind !== 'hard') ops.push(this.content(record, { field: 'kind', value: kind }));
    if (reason !== '') ops.push(this.content(record, { field: 'reason', value: reason }));
    await this.emit(ops);
    return { ok: true, id };
  }

  async removeLink(linkId: Id): Promise<Validated<void>> {
    if (!this.canEditLink(linkId)) return forbidden('linkId');
    await this.emit([this.meta({ type: 'link', id: linkId }, { kind: 'removeLink' })]);
    return done;
  }

  async setLinkField(linkId: Id, field: 'kind' | 'reason', value: unknown): Promise<Validated<void>> {
    if (!this.canEditLink(linkId)) return forbidden('linkId');
    const valid = validateField('link', field, value);
    if (!valid.ok) return valid;
    await this.emit([this.content({ type: 'link', id: linkId }, { field, value: valid.value as ContentChange['value'] })]);
    return done;
  }

  /** Forgets a rejected operation, by its operation ID. */
  async discardRejected(opId: Id): Promise<void> {
    this.refused = this.refused.filter((r) => r.op.id !== opId);
    await this.store.removeRejected(opId);
  }

  // Sync

  /**
   * Pushes the outbox, then pulls the feed until it is caught up. A call made while another is
   * running is coalesced into one more run after it. Network and session failures set `status`
   * rather than throwing.
   */
  sync(): Promise<void> {
    this.requests += 1;
    if (this.running !== null) return this.running;
    const run = async (): Promise<void> => {
      try {
        let handled: number;
        do {
          handled = this.requests;
          await this.syncOnce();
        } while (this.requests !== handled && this.currentStatus !== 'revoked');
      } finally {
        this.running = null;
      }
    };
    this.running = run();
    return this.running;
  }

  /** Syncs whenever the transport says the feed grew. Returns a function that stops it. */
  startLive(): () => void {
    return this.transport.subscribe(() => {
      // Network and session failures already set `status`; anything else goes to onError.
      this.sync().catch(this.onError);
    });
  }

  private async syncOnce(): Promise<void> {
    if (this.currentStatus === 'revoked') return;
    try {
      await this.push();
      await this.pull();
      this.currentStatus = 'ok';
    } catch (error) {
      if (error instanceof NetworkError) {
        this.currentStatus = 'offline';
      } else if (error instanceof SessionError && error.code === 'session-revoked') {
        await this.wipe();
      } else if (error instanceof SessionError) {
        this.currentStatus = 'logged-out';
      } else {
        throw error;
      }
    }
  }

  private async push(): Promise<void> {
    // Operations added while pushing (including folded links) go out in a later batch.
    const sent = new Set<Id>();
    for (;;) {
      const batch = this.outbox.filter((op) => !sent.has(op.id)).slice(0, PUSH_BATCH);
      if (batch.length === 0) return;
      for (const op of batch) sent.add(op.id);
      const results = await this.transport.push(batch);
      for (const result of results) await this.applyResult(result);
      this.recompute();
    }
  }

  private async applyResult(result: PushResult): Promise<void> {
    const op = this.outbox.find((o) => o.id === result.id);
    if (op === undefined) return; // Already handled, e.g. dropped by folding a duplicate link.
    if (result.status === 'accepted') {
      // Confirm it now, so the state doesn't lose it until the feed echoes it back.
      const confirmed: FeedOp = { ...op, seq: result.seq, authorId: this.userId };
      this.confirmed.set(op.id, confirmed);
      await this.store.appendConfirmed([confirmed], this.cursor);
      await this.dropPending([op.id]);
    } else if (result.code === 'duplicate-link' && result.existingLinkId !== undefined && op.meta?.kind === 'createLink') {
      await this.foldLink(op.record.id, result.existingLinkId);
    } else {
      const rejected: RejectedOp = { op, code: result.code, at: new Date(this.now()).toISOString() };
      if (result.errors !== undefined) rejected.errors = result.errors;
      this.refused.push(rejected);
      await this.store.putRejected(rejected);
      await this.dropPending([op.id]);
    }
  }

  /**
   * Folds a local link into the server's existing one: its pending `kind` and `reason` are
   * re-issued on the existing link with their original HLCs (so newest-wins stays fair) and
   * new operation IDs, and all of the local link's operations are dropped.
   */
  private async foldLink(localId: Id, existingId: Id): Promise<void> {
    const local = this.outbox.filter((op) => op.record.type === 'link' && op.record.id === localId);
    const reissued: Operation[] = [];
    for (const op of local) {
      if (op.content !== null && (op.content.field === 'kind' || op.content.field === 'reason')) {
        reissued.push({ id: this.newId(), hlc: op.hlc, record: { type: 'link', id: existingId }, meta: null, content: op.content });
      }
    }
    // Store the copies before dropping the originals: a crash in between leaves the originals
    // pending, and the next push folds them again with the same HLCs and values.
    this.outbox.push(...reissued);
    for (const op of reissued) await this.store.putPending(op);
    await this.dropPending(local.map((op) => op.id));
  }

  private async pull(): Promise<void> {
    for (;;) {
      const before = this.cursor;
      const page = await this.transport.pull(this.cursor, PULL_LIMIT);
      await this.applyPage(page);
      if (!page.more || this.cursor <= before) return;
    }
  }

  private async applyPage(page: PullPage): Promise<void> {
    let fresh: FeedOp[] = [];
    let cursor = this.cursor;
    for (const entry of page.entries) {
      if (entry.kind === 'op') {
        this.receive(entry.op.hlc);
        if (!this.confirmed.has(entry.op.id)) {
          this.confirmed.set(entry.op.id, entry.op);
          fresh.push(entry.op);
        }
      } else {
        // Store the operations before the forget first, so the store applies them in feed order.
        if (fresh.length > 0) await this.store.appendConfirmed(fresh, cursor);
        fresh = [];
        const kept = forgetOps([...this.confirmed.values()], entry.record);
        this.confirmed = new Map(kept.map((op) => [op.id, op]));
        await this.store.forget(entry.record, Math.max(cursor, entry.id));
      }
      cursor = Math.max(cursor, entry.id);
    }
    this.cursor = Math.max(cursor, page.cursor);
    await this.store.appendConfirmed(fresh, this.cursor);
    this.recompute();
  }

  private async wipe(): Promise<void> {
    await this.store.wipe();
    this.confirmed = new Map();
    this.outbox = [];
    this.refused = [];
    this.cursor = 0;
    this.currentStatus = 'revoked';
    this.recompute();
  }

  // Helpers

  /**
   * Advances the clock past a received HLC. Pages are schema-checked by the transport, but one
   * malformed value must not stop sync, so a value the clock refuses is skipped.
   */
  private receive(hlc: string): void {
    try {
      this.clock.receive(hlc);
    } catch {
      // Skipped: see above.
    }
  }

  private canEditLink(linkId: Id): boolean {
    const link = this.current.links.get(linkId);
    if (link === undefined) return false;
    const access = accessData(this.current);
    return can(access, this.userId, 'edit', link.prerequisiteId) && can(access, this.userId, 'edit', link.postrequisiteId);
  }

  private meta(record: RecordRef, meta: MetaChange): Operation {
    return { id: this.newId(), hlc: this.clock.tick(), record, meta, content: null };
  }

  private content(record: RecordRef, content: ContentChange): Operation {
    return { id: this.newId(), hlc: this.clock.tick(), record, meta: null, content };
  }

  /** Applies new local operations at once, then stores them. */
  private async emit(ops: Operation[]): Promise<void> {
    this.outbox.push(...ops);
    this.recompute();
    for (const op of ops) await this.store.putPending(op);
  }

  private async dropPending(ids: Id[]): Promise<void> {
    const drop = new Set(ids);
    this.outbox = this.outbox.filter((op) => !drop.has(op.id));
    for (const id of ids) await this.store.removePending(id);
  }

  /** Confirmed operations, plus pending ones not yet confirmed, authored by this user. */
  private *merged(): Iterable<FeedOp | (Operation & { authorId: Id })> {
    yield* this.confirmed.values();
    for (const op of this.outbox) {
      if (!this.confirmed.has(op.id)) yield { ...op, authorId: this.userId };
    }
  }

  private recompute(): void {
    this.current = materialize(this.merged());
  }
}
