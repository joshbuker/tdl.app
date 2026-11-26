import type { Id, Validated } from '@tdl/domain';
import type { RejectedOp, Replica } from '@tdl/sync';

// Copying a change the server refused into the user's own lists, as a new task, so nothing they
// typed is lost (docs/features/app/offline.md).

/** What a new task copied from a refused change holds. */
export interface CopiedTask {
  title: string;
  notes: string;
}

const text = (rejected: RejectedOp, field: string): string | undefined => {
  const content = rejected.op.content;
  return content?.field === field && typeof content.value === 'string' ? content.value : undefined;
};

/**
 * The new task a refused change to a task becomes: the title from the change if it has one,
 * otherwise the task's title last known; and the notes from the change if it has them. Null when
 * there is nothing to copy: the change isn't to a task, or no title is known.
 */
export function rejectedTaskContent(rejected: RejectedOp): CopiedTask | null {
  if (rejected.op.record.type !== 'task') return null;
  const title = text(rejected, 'title') ?? rejected.title;
  if (title === undefined || title === '') return null;
  return { title, notes: text(rejected, 'notes') ?? '' };
}

/** Copies in progress, by replica and operation ID. */
const copying = new WeakMap<object, Map<Id, Promise<Validated<Id>>>>();

/**
 * Copies the refused change `opId` into the list as a new task, then drops it from the refused
 * changes. A change that is gone, or has nothing to copy, gives an `invalid` error on `opId`.
 * Asked again while the copy is in progress (e.g. a double click), it gives the same result
 * rather than copying twice.
 */
export function copyRejected(
  replica: Pick<Replica, 'rejected' | 'createTask' | 'discardRejected'>,
  opId: Id,
  listId: Id,
): Promise<Validated<Id>> {
  let inProgress = copying.get(replica);
  if (inProgress === undefined) {
    inProgress = new Map();
    copying.set(replica, inProgress);
  }
  const running = inProgress.get(opId);
  if (running !== undefined) return running;
  const copy = copyOnce(replica, opId, listId).finally(() => {
    inProgress.delete(opId);
  });
  inProgress.set(opId, copy);
  return copy;
}

async function copyOnce(
  replica: Pick<Replica, 'rejected' | 'createTask' | 'discardRejected'>,
  opId: Id,
  listId: Id,
): Promise<Validated<Id>> {
  const rejected = replica.rejected().find((r) => r.op.id === opId);
  const copied = rejected === undefined ? null : rejectedTaskContent(rejected);
  if (copied === null) return { ok: false, errors: [{ field: 'opId', code: 'invalid' }] };
  const created = await replica.createTask(listId, copied.title, copied.notes);
  if (created.ok) await replica.discardRejected(opId);
  return created;
}
