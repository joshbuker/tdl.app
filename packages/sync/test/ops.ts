import type { Id } from '@tdl/domain';
import type { Operation, RecordRef } from '../src/operations.ts';

export type TestOp = Operation & { authorId: Id };

let counter = 0;

/** An HLC for test time `n`: wall-clock ms = n, from device `node`. */
export const at = (n: number, node = 'a'): string => `${String(n).padStart(15, '0')}:000000:${node}`;

function op(record: RecordRef, hlc: string, authorId: Id, part: Pick<Operation, 'meta' | 'content'>): TestOp {
  counter += 1;
  return { id: `op-${String(counter)}`, hlc, record, authorId, ...part };
}

export const createList = (id: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'list', id }, hlc, authorId, { meta: { kind: 'createList' }, content: null });

export const createTask = (id: Id, listId: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'task', id }, hlc, authorId, { meta: { kind: 'createTask', listId }, content: null });

export const moveTask = (id: Id, listId: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'task', id }, hlc, authorId, { meta: { kind: 'moveTask', listId }, content: null });

export const createLink = (id: Id, prerequisiteId: Id, postrequisiteId: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'link', id }, hlc, authorId, {
    meta: { kind: 'createLink', prerequisiteId, postrequisiteId },
    content: null,
  });

export const removeLink = (id: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'link', id }, hlc, authorId, { meta: { kind: 'removeLink' }, content: null });

export const grant = (
  id: Id,
  userId: Id,
  target: { kind: 'list' | 'task'; id: Id },
  role: 'editor' | 'commenter' | 'viewer',
  hlc: string,
  authorId: Id,
): TestOp => op({ type: 'grant', id }, hlc, authorId, { meta: { kind: 'grant', userId, target, role }, content: null });

export const revokeGrant = (id: Id, hlc: string, authorId: Id): TestOp =>
  op({ type: 'grant', id }, hlc, authorId, { meta: { kind: 'revokeGrant' }, content: null });

export const setField = (
  type: RecordRef['type'],
  id: Id,
  field: string,
  value: Operation['content'] extends infer C ? (C extends { value: infer V } ? V : never) : never,
  hlc: string,
  authorId: Id,
): TestOp => op({ type, id }, hlc, authorId, { meta: null, content: { field, value } });
