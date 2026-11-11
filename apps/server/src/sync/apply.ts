import { audienceOf, type AccessData, type Grant, type Id, type List } from '@tdl/domain';
import { createClock, operationSchema, type Operation, type RecordRef } from '@tdl/sync';
import { eq, and } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { feed, grants, lists, operations } from '../db/schema.ts';

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
 * accepted operation, server-made or pushed.
 */
export async function applyOperation(tx: Tx, op: Operation, actor: Actor): Promise<number> {
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
    })
    .returning({ seq: operations.seq });
  if (stored === undefined) throw new Error('operation not stored');

  if (op.meta?.kind === 'createList') {
    await tx.insert(lists).values({ id: op.record.id, ownerId: actor.userId });
  } else if (op.meta !== null) {
    throw new Error(`unsupported operation: ${op.meta.kind}`);
  }

  const audience = audienceOf(await loadAccess(tx, op.record), [], op.record);
  if (audience.size > 0) {
    await tx.insert(feed).values(
      [...audience].map((userId) => ({ userId, kind: 'op', opSeq: stored.seq, recordType: op.record.type, recordId: op.record.id })),
    );
  }
  return stored.seq;
}

/** Stamps server-made operations with the server clock, then applies each one, authored by `actorId`. Returns their sequence numbers. */
export async function writeServerOps(tx: Tx, actorId: Id, ops: Omit<Operation, 'hlc'>[]): Promise<number[]> {
  const seqs: number[] = [];
  for (const op of ops) {
    const stamped = operationSchema.parse({ ...op, hlc: serverClock.tick() });
    seqs.push(await applyOperation(tx, stamped, { userId: actorId, sessionId: null }));
  }
  return seqs;
}

// The access data needed to find a record's audience. Metadata only: content (the list title) is never read.
async function loadAccess(tx: Tx, record: RecordRef): Promise<AccessData> {
  if (record.type !== 'list') throw new Error(`unsupported record type: ${record.type}`);
  const listRows = await tx.select().from(lists).where(eq(lists.id, record.id));
  const grantRows = await tx
    .select()
    .from(grants)
    .where(and(eq(grants.targetKind, 'list'), eq(grants.targetId, record.id)));
  return {
    lists: new Map<Id, List>(listRows.map((l) => [l.id, { id: l.id, ownerId: l.ownerId, title: '', editorsCanShare: l.editorsCanShare }])),
    tasks: new Map(),
    grants: grantRows.map(
      (g): Grant => ({ id: g.id, userId: g.userId, target: { kind: 'list', id: g.targetId }, role: g.role as Grant['role'] }),
    ),
  };
}
