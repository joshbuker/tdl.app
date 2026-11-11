import { audienceOf, type AccessData, type Id } from '@tdl/domain';
import { createClock, operationSchema, type Operation } from '@tdl/sync';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { feed, grants, links, lists, operations, tasks } from '../db/schema.ts';
import { loadAccess, type LoadedAccess } from './access-loader.ts';

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Who an operation is applied for: its author, and the session it came from (none for server-made operations). */
export interface Actor {
  userId: Id;
  sessionId: Id | null;
}

// One clock per server process; server-made operations take their HLC from it (node ID `server`).
const serverClock = createClock('server', () => Date.now());

/**
 * Stores an authorized, validated operation, updates current state and fans it out to its
 * audience's feeds. Returns the operation's sequence number. The single entry point for every
 * accepted operation, server-made or pushed. `loaded` is the access data already loaded for
 * authorization, if any.
 */
export async function applyOperation(tx: Tx, op: Operation, actor: Actor, now: () => number, loaded?: LoadedAccess): Promise<number> {
  const before = loaded ?? (await loadAccess(tx, op));
  await updateCurrentState(tx, op, actor);

  const [stored] = await tx
    .insert(operations)
    .values({
      id: op.id,
      hlc: op.hlc,
      recordType: op.record.type,
      recordId: op.record.id,
      meta: op.meta,
      content: op.content,
      authorId: actor.userId,
      sessionId: actor.sessionId,
      receivedAt: new Date(now()),
    })
    .returning({ seq: operations.seq });
  if (stored === undefined) throw new Error('operation not stored');

  // TODO(Task 8): `moveTask`, `grant` and `revokeGrant` change who sees which records. The
  // visibility change (history for users who gained records, `forget`s for those who lost them)
  // hooks in here; until then they fan out like any other operation.
  const after = afterState(before, op, actor.userId);
  const audience = audienceOf(after.access, after.links, op.record);
  if (audience.size > 0) {
    await tx.insert(feed).values(
      [...audience].map((userId) => ({ userId, kind: 'op', opSeq: stored.seq, recordType: op.record.type, recordId: op.record.id })),
    );
  }
  return stored.seq;
}

/** Stamps server-made operations with the server clock, then applies each one, authored by `actorId`. Returns their sequence numbers. */
export async function writeServerOps(tx: Tx, actorId: Id, ops: Omit<Operation, 'hlc'>[], now: () => number): Promise<number[]> {
  const seqs: number[] = [];
  for (const op of ops) {
    const stamped = operationSchema.parse({ ...op, hlc: serverClock.tick() });
    seqs.push(await applyOperation(tx, stamped, { userId: actorId, sessionId: null }, now));
  }
  return seqs;
}

// Updates the metadata tables. Content is never stored here, except `editorsCanShare`, which authorization needs.
async function updateCurrentState(tx: Tx, op: Operation, actor: Actor): Promise<void> {
  const id = op.record.id;
  const meta = op.meta;
  switch (meta?.kind) {
    case 'createList':
      await tx.insert(lists).values({ id, ownerId: actor.userId });
      return;
    case 'createTask':
      await tx.insert(tasks).values({ id, listId: meta.listId });
      return;
    case 'moveTask':
      await tx.update(tasks).set({ listId: meta.listId }).where(eq(tasks.id, id));
      return;
    case 'createLink':
      // A link between the same two tasks in the same direction violates the pair's unique index;
      // the caller turns that into `duplicate-link`.
      await tx.insert(links).values({ id, prerequisiteId: meta.prerequisiteId, postrequisiteId: meta.postrequisiteId });
      return;
    case 'removeLink':
      await tx.delete(links).where(eq(links.id, id));
      return;
    case 'grant':
      await tx.insert(grants).values({ id, userId: meta.userId, targetKind: meta.target.kind, targetId: meta.target.id, role: meta.role });
      return;
    case 'revokeGrant':
      await tx.delete(grants).where(eq(grants.id, id));
      return;
    case undefined:
      if (op.record.type === 'list' && op.content?.field === 'editorsCanShare' && typeof op.content.value === 'boolean') {
        await tx.update(lists).set({ editorsCanShare: op.content.value }).where(eq(lists.id, id));
      }
  }
}

/**
 * The access data and links after `op`, for finding its audience. Removals keep the removed
 * record, so the people who could see it hear that it went.
 */
function afterState(before: LoadedAccess, op: Operation, actorId: Id): { access: AccessData; links: LoadedAccess['links'] } {
  const id = op.record.id;
  const meta = op.meta;
  const { access } = before;
  switch (meta?.kind) {
    case 'createList':
      return {
        access: { ...access, lists: new Map(access.lists).set(id, { id, ownerId: actorId, title: '', editorsCanShare: false }) },
        links: before.links,
      };
    case 'createTask':
    case 'moveTask':
      return { access: { ...access, tasks: new Map(access.tasks).set(id, { id, listId: meta.listId }) }, links: before.links };
    case 'createLink':
      return { access, links: [...before.links, { id, prerequisiteId: meta.prerequisiteId, postrequisiteId: meta.postrequisiteId }] };
    case 'grant':
      return { access: { ...access, grants: [...access.grants, { id, userId: meta.userId, target: meta.target, role: meta.role }] }, links: before.links };
    default:
      return { access, links: before.links };
  }
}
