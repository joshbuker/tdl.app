import { audienceOf, visibleRecords, type AccessData, type Id, type VisibleRecords } from '@tdl/domain';
import type { Operation, RecordRef } from '@tdl/sync';
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

const KINDS = ['grant', 'link', 'task', 'list'] as const;
const KEY = { list: 'lists', task: 'tasks', link: 'links', grant: 'grants' } as const satisfies Record<RecordRef['type'], keyof VisibleRecords>;

/**
 * For each affected user, compares what they could see in scope before and after `op` (stored as
 * `seq`). Records they gained get all their earlier operations appended to their feed, in `seq`
 * order; records they lost get `forget` rows, grants and links before tasks, and tasks before
 * lists. A grant's own record is left out: the `grant` or `revokeGrant` itself, fanned out next,
 * tells the grantee.
 */
export async function applyVisibilityChange(
  tx: Tx,
  op: Operation,
  before: AccessData,
  after: AccessData,
  affected: readonly Id[],
  context: { seq: number; links: readonly LinkEnds[] },
): Promise<void> {
  const skip = op.record.type === 'grant' ? op.record.id : null;
  for (const userId of affected) {
    const was = visibleRecords(before, context.links, userId);
    const is = visibleRecords(after, context.links, userId);
    const gained: Id[] = [];
    const lost: RecordRef[] = [];
    for (const type of KINDS) {
      const [then, now] = [was[KEY[type]], is[KEY[type]]];
      for (const id of now) if (!then.has(id) && id !== skip) gained.push(id);
      for (const id of [...then].sort()) if (!now.has(id) && id !== skip) lost.push({ type, id });
    }

    const history =
      gained.length === 0
        ? []
        : await tx
            .select({ seq: operations.seq, recordType: operations.recordType, recordId: operations.recordId })
            .from(operations)
            .where(and(inArray(operations.recordId, gained), lt(operations.seq, context.seq)))
            .orderBy(asc(operations.seq));
    await insertFeed(tx, [
      ...history.map((h) => ({ userId, kind: 'op', opSeq: h.seq, recordType: h.recordType, recordId: h.recordId })),
      ...lost.map((record) => ({ userId, kind: 'forget', opSeq: null, recordType: record.type, recordId: record.id })),
    ]);
  }
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
