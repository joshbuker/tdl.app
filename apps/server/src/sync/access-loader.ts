import type { AccessData, Grant, Id, Link, List } from '@tdl/domain';
import type { Operation } from '@tdl/sync';
import { and, eq, inArray, or } from 'drizzle-orm';
import { grants, links, lists, tasks } from '../db/schema.ts';
import type { Tx } from './apply.ts';

export type LinkEnds = Pick<Link, 'id' | 'prerequisiteId' | 'postrequisiteId'>;

/**
 * The server's own current state for the records an operation involves: the access data the
 * domain resolver needs, the links involved, and whether the operation's record already exists.
 * Metadata only; content is never read.
 */
export interface LoadedAccess {
  access: AccessData;
  links: LinkEnds[];
  exists: boolean;
}

/** Loads what authorizing and fanning out `op` needs. Never trusts the operation's claims about existing records. */
export async function loadAccess(tx: Tx, op: Operation): Promise<LoadedAccess> {
  const { type, id } = op.record;

  if (type === 'list') {
    const access = await collect(tx, { listIds: [id] });
    return { access, links: [], exists: access.lists.has(id) };
  }

  if (type === 'task') {
    const listIds = op.meta?.kind === 'createTask' || op.meta?.kind === 'moveTask' ? [op.meta.listId] : [];
    const access = await collect(tx, { listIds, taskIds: [id] });
    return { access, links: [], exists: access.tasks.has(id) };
  }

  if (type === 'link') {
    const [link] = await tx
      .select({ id: links.id, prerequisiteId: links.prerequisiteId, postrequisiteId: links.postrequisiteId })
      .from(links)
      .where(eq(links.id, id));
    if (op.meta?.kind === 'createLink') {
      const access = await collect(tx, { taskIds: [op.meta.prerequisiteId, op.meta.postrequisiteId] });
      return { access, links: [], exists: link !== undefined };
    }
    if (link === undefined) return { access: empty(), links: [], exists: false };
    const access = await collect(tx, { taskIds: [link.prerequisiteId, link.postrequisiteId] });
    return { access, links: [link], exists: true };
  }

  // A grant record: its target, as stored, or as the `grant` operation names it.
  const [stored] = await tx.select({ targetKind: grants.targetKind, targetId: grants.targetId }).from(grants).where(eq(grants.id, id));
  const target = op.meta?.kind === 'grant' ? op.meta.target : stored === undefined ? null : { kind: stored.targetKind, id: stored.targetId };
  if (target === null) return { access: empty(), links: [], exists: false };
  const access = await collect(tx, target.kind === 'list' ? { listIds: [target.id] } : { taskIds: [target.id] });
  return { access, links: [], exists: stored !== undefined };
}

const empty = (): AccessData => ({ lists: new Map(), tasks: new Map(), grants: [] });

/** The given tasks and lists (plus each task's list), and every grant on them. */
export async function collect(tx: Tx, ids: { listIds?: Id[]; taskIds?: Id[] }): Promise<AccessData> {
  const taskIds = [...new Set(ids.taskIds ?? [])];
  const taskRows = taskIds.length === 0 ? [] : await tx.select({ id: tasks.id, listId: tasks.listId }).from(tasks).where(inArray(tasks.id, taskIds));
  const listIds = [...new Set([...(ids.listIds ?? []), ...taskRows.map((t) => t.listId)])];
  const listRows =
    listIds.length === 0
      ? []
      : await tx.select({ id: lists.id, ownerId: lists.ownerId, editorsCanShare: lists.editorsCanShare }).from(lists).where(inArray(lists.id, listIds));

  const targets = [
    ...(listIds.length === 0 ? [] : [and(eq(grants.targetKind, 'list'), inArray(grants.targetId, listIds))]),
    ...(taskIds.length === 0 ? [] : [and(eq(grants.targetKind, 'task'), inArray(grants.targetId, taskIds))]),
  ];
  const grantRows = targets.length === 0 ? [] : await tx.select().from(grants).where(or(...targets));

  return {
    // List titles are content and never read; the resolver doesn't need them.
    lists: new Map<Id, List>(listRows.map((l) => [l.id, { ...l, title: '' }])),
    tasks: new Map(taskRows.map((t) => [t.id, t])),
    grants: grantRows.map(
      (g): Grant => ({ id: g.id, userId: g.userId, target: { kind: g.targetKind as Grant['target']['kind'], id: g.targetId }, role: g.role as Grant['role'] }),
    ),
  };
}
