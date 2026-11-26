import { newId, type Validated } from '@tdl/domain';
import type { Operation, RejectedOp } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { copyRejected, rejectedTaskContent } from '../src/rejected.ts';

const taskId = newId();
const at = '2026-11-26T00:00:00.000Z';

function rejected(op: Pick<Operation, 'record' | 'meta' | 'content'>, title?: string): RejectedOp {
  return { op: { id: newId(), hlc: '001800000000000-0000-phone', ...op }, code: 'not-found', at, ...(title === undefined ? {} : { title }) };
}
const content = (field: string, value: string, title?: string) => rejected({ record: { type: 'task', id: taskId }, meta: null, content: { field, value } }, title);

describe('rejectedTaskContent', () => {
  test('a title change gives its title', () => {
    expect(rejectedTaskContent(content('title', 'Paint the fence', 'Paint fence'))).toEqual({ title: 'Paint the fence', notes: '' });
  });

  test('a notes change gives the notes, under the task title last known', () => {
    expect(rejectedTaskContent(content('notes', 'Use oil paint', 'Paint fence'))).toEqual({ title: 'Paint fence', notes: 'Use oil paint' });
  });

  test('creating a task gives its title last known', () => {
    const op = rejected({ record: { type: 'task', id: taskId }, meta: { kind: 'createTask', listId: newId() }, content: null }, 'Fix roof');
    expect(rejectedTaskContent(op)).toEqual({ title: 'Fix roof', notes: '' });
  });

  test('nothing to copy without a title, or for something other than a task', () => {
    expect(rejectedTaskContent(content('notes', 'Use oil paint'))).toBeNull();
    expect(rejectedTaskContent(content('notes', 'Use oil paint', ''))).toBeNull();
    const list = rejected({ record: { type: 'list', id: newId() }, meta: null, content: { field: 'title', value: 'House' } }, 'House');
    expect(rejectedTaskContent(list)).toBeNull();
  });

  test('a change that is neither title nor notes gives the title last known', () => {
    const op = rejected({ record: { type: 'task', id: taskId }, meta: null, content: { field: 'completedAt', value: at } }, 'Paint fence');
    expect(rejectedTaskContent(op)).toEqual({ title: 'Paint fence', notes: '' });
  });
});

describe('copyRejected', () => {
  function fakeReplica(refused: RejectedOp[], result: Validated<string> = { ok: true, value: 'new-task' }) {
    const created: { listId: string; title: string; notes: string | undefined }[] = [];
    const discarded: string[] = [];
    return {
      created,
      discarded,
      rejected: () => refused,
      createTask: (listId: string, title: string, notes?: string) => {
        created.push({ listId, title, notes });
        return Promise.resolve(result);
      },
      discardRejected: (opId: string) => {
        discarded.push(opId);
        return Promise.resolve();
      },
    };
  }

  test('creates a task in the list from the change, then drops the change', async () => {
    const change = content('notes', 'Use oil paint', 'Paint fence');
    const replica = fakeReplica([change]);
    await expect(copyRejected(replica, change.op.id, 'inbox')).resolves.toEqual({ ok: true, value: 'new-task' });
    expect(replica.created).toEqual([{ listId: 'inbox', title: 'Paint fence', notes: 'Use oil paint' }]);
    expect(replica.discarded).toEqual([change.op.id]);
  });

  test('copying a change again while it is being copied (e.g. a double click) creates one task', async () => {
    const change = content('title', 'Paint the fence');
    const replica = fakeReplica([change]);
    const [first, second] = await Promise.all([copyRejected(replica, change.op.id, 'inbox'), copyRejected(replica, change.op.id, 'inbox')]);
    expect(first).toEqual({ ok: true, value: 'new-task' });
    expect(second).toEqual(first);
    expect(replica.created).toHaveLength(1);
  });

  test('keeps the change when the task is refused', async () => {
    const change = content('title', 'Paint the fence');
    const replica = fakeReplica([change], { ok: false, errors: [{ field: 'listId', code: 'forbidden' }] });
    await expect(copyRejected(replica, change.op.id, 'inbox')).resolves.toEqual({ ok: false, errors: [{ field: 'listId', code: 'forbidden' }] });
    expect(replica.discarded).toEqual([]);
  });

  test('a change with nothing to copy, or that is gone, is invalid', async () => {
    const change = content('notes', 'Use oil paint');
    const replica = fakeReplica([change]);
    const invalid = { ok: false, errors: [{ field: 'opId', code: 'invalid' }] };
    await expect(copyRejected(replica, change.op.id, 'inbox')).resolves.toEqual(invalid);
    await expect(copyRejected(replica, newId(), 'inbox')).resolves.toEqual(invalid);
    expect(replica.created).toEqual([]);
  });
});
