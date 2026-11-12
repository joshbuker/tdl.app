import { audienceOf, visibilityChange, type AccessData, type Id, type RecordKey } from '@tdl/domain';
import type { Operation } from '@tdl/sync';
import { and, asc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { feed, grants, operations, tasks } from '../db/schema.ts';
import type { LinkEnds } from './access-loader.ts';
import type { Tx } from './apply.ts';

/**
 * The records a visibility-changing operation can affect: the target list's or task's tasks,
 * every link touching them (removed ones too, found through `createLink` metadata), the tasks at
 * the links' other ends, and through `collect`, their lists and every grant on them.
 */
export interface VisibilityScope {
  listIds: Id[];
  taskIds: Id[];
  links: LinkEnds[];
}

/** The scope of `op` if it can change who sees which records (`moveTask`, `grant`, `revokeGrant`); null otherwise. Load it before applying `op`. */
export async function loadVisibilityScope(tx: Tx, op: Operation): Promise<VisibilityScope | null> {
  const meta = op.meta;
  let target: { listIds: Id[]; taskIds: Id[] };
  if (meta?.kind === 'moveTask') {
    const [task] = await tx.select({ listId: tasks.listId }).from(tasks).where(eq(tasks.id, op.record.id));
    target = { listIds: task === undefined ? [meta.listId] : [task.listId, meta.listId], taskIds: [op.record.id] };
  } else if (meta?.kind === 'grant' || meta?.kind === 'revokeGrant') {
    const [stored] = await tx.select({ kind: grants.targetKind, id: grants.targetId }).from(grants).where(eq(grants.id, op.record.id));
    const grantTarget = meta.kind === 'grant' ? meta.target : stored;
    if (grantTarget === undefined) return null;
    if (grantTarget.kind === 'list') {
      const listTasks = await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.listId, grantTarget.id));
      target = { listIds: [grantTarget.id], taskIds: listTasks.map((t) => t.id) };
    } else {
      target = { listIds: [], taskIds: [grantTarget.id] };
    }
  } else {
    return null;
  }

  const links = await linksTouching(tx, target.taskIds);
  const ends = links.flatMap((l) => [l.prerequisiteId, l.postrequisiteId]);
  return { listIds: target.listIds, taskIds: [...new Set([...target.taskIds, ...ends])], links };
}

/** The users whose view `op` can change: a moved task's audiences before and after, or a grant's grantee. */
export function affectedUsers(op: Operation, before: AccessData, after: AccessData, links: readonly LinkEnds[]): Id[] {
  switch (op.meta?.kind) {
    case 'moveTask':
      return [...new Set([...audienceOf(before, links, op.record), ...audienceOf(after, links, op.record)])];
    case 'grant':
      return [op.meta.userId];
    case 'revokeGrant': {
      const grant = before.grants.find((g) => g.id === op.record.id);
      return grant === undefined ? [] : [grant.userId];
    }
    default:
      return [];
  }
}

export interface VisibilityChange {
  /** The operation's sequence number; only earlier operations are history. */
  seq: number;
  links: readonly LinkEnds[];
  affected: readonly Id[];
}

/**
 * Appends to each affected user's feed the earlier operations of records they gained, in `seq`
 * order, then `forget` rows for records they lost, in forget order. A grant's own record is left
 * out: the `grant` or `revokeGrant` itself, fanned out next, tells the grantee.
 */
export async function applyVisibilityChange(tx: Tx, op: Operation, before: AccessData, after: AccessData, change: VisibilityChange): Promise<void> {
  const isOther = (record: RecordKey) => !(op.record.type === 'grant' && record.id === op.record.id);
  for (const userId of change.affected) {
    const { gained, lost } = visibilityChange(before, after, change.links, userId);
    const history = await historyOf(tx, gained.filter(isOther).map((r) => r.id), change.seq);
    await insertFeed(tx, [
      ...history.map((h) => ({ userId, kind: 'op', opSeq: h.seq, recordType: h.recordType, recordId: h.recordId })),
      ...lost.filter(isOther).map((r) => ({ userId, kind: 'forget', opSeq: null, recordType: r.type, recordId: r.id })),
    ]);
  }
}

/** The records' operations before `seq`, in `seq` order. */
async function historyOf(tx: Tx, recordIds: Id[], seq: number) {
  if (recordIds.length === 0) return [];
  return tx
    .select({ seq: operations.seq, recordType: operations.recordType, recordId: operations.recordId })
    .from(operations)
    .where(and(inArray(operations.recordId, recordIds), lt(operations.seq, seq)))
    .orderBy(asc(operations.seq));
}

/** Every link ever made with one end in `taskIds`, removed ones included. Reads only `createLink` metadata. */
async function linksTouching(tx: Tx, taskIds: Id[]): Promise<LinkEnds[]> {
  if (taskIds.length === 0) return [];
  const prerequisite = sql<string>`${operations.meta}->>'prerequisiteId'`;
  const postrequisite = sql<string>`${operations.meta}->>'postrequisiteId'`;
  return tx
    .select({ id: operations.recordId, prerequisiteId: prerequisite, postrequisiteId: postrequisite })
    .from(operations)
    .where(and(sql`${operations.meta}->>'kind' = 'createLink'`, or(inArray(prerequisite, taskIds), inArray(postrequisite, taskIds))));
}

type FeedRow = typeof feed.$inferInsert;

// Keeps each insert well under Postgres's limit on bound parameters.
const CHUNK = 1000;

/** Appends rows to the feed in the given order. */
export async function insertFeed(tx: Tx, rows: FeedRow[]): Promise<void> {
  for (let start = 0; start < rows.length; start += CHUNK) await tx.insert(feed).values(rows.slice(start, start + CHUNK));
}
