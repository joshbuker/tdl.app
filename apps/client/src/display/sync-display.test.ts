import type { Id } from '@tdl/domain';
import {
  materialize,
  type DeviceState,
  type Operation,
  type RejectedOp,
  type ReplicaStatus,
} from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { pageContent, rejectedRows, syncStatusView } from './sync-display.ts';

const hlc = '2026-11-13T00:00:00.000Z-0000-device';

function op(id: Id, record: Operation['record']): Operation {
  return { id, hlc, record, meta: null, content: { field: 'title', value: 'x' } };
}

function replicaWith(
  status: ReplicaStatus,
  reason: string | null = null,
  pending = 0,
  rejected = 0,
) {
  return {
    status: () => status,
    statusReason: () => reason,
    pending: () =>
      Array.from({ length: pending }, (_, i) => op(`p${String(i)}`, { type: 'task', id: 't' })),
    rejected: () =>
      Array.from({ length: rejected }, (_, i) => ({
        op: op(`r${String(i)}`, { type: 'task', id: 't' }),
        code: 'forbidden' as const,
        at: hlc,
      })),
  };
}

function stateWith(lists: [Id, string][], tasks: [Id, string][] = []): DeviceState {
  const state = materialize([]);
  for (const [id, title] of lists) {
    state.lists.set(id, { id, title } as never);
  }
  for (const [id, title] of tasks) {
    state.tasks.set(id, { id, title } as never);
  }
  return state;
}

describe('syncStatusView', () => {
  test('synced, with nothing waiting', () => {
    expect(syncStatusView(replicaWith('ok'))).toEqual({
      textKey: 'status.ok',
      icon: 'cloud_done',
      color: 'positive',
      reasonKey: null,
      pending: 0,
      rejected: 0,
      reload: false,
    });
  });

  test('counts the changes waiting and those that could not sync', () => {
    const view = syncStatusView(replicaWith('offline', null, 2, 1));
    expect(view).toMatchObject({ textKey: 'status.offline', pending: 2, rejected: 1 });
  });

  test('stuck says why, through the error translations', () => {
    expect(syncStatusView(replicaWith('stuck', 'forbidden')).reasonKey).toBe('errors.forbidden');
    expect(syncStatusView(replicaWith('stuck', 'some-new-code')).reasonKey).toBe('errors.unknown');
  });

  test('an outdated app offers to reload, to update it', () => {
    expect(syncStatusView(replicaWith('app-outdated'))).toMatchObject({
      textKey: 'status.app-outdated',
      reload: true,
    });
  });

  test.each<ReplicaStatus>(['logged-out', 'revoked', 'stuck', 'app-outdated', 'server-outdated'])(
    '%s is shown as a problem',
    (status) => {
      expect(syncStatusView(replicaWith(status)).color).toBe('negative');
    },
  );
});

describe('rejectedRows', () => {
  test('names each rejected change by its record title, else its ID', () => {
    const state = stateWith([['list-1', 'House']], [['task-1', 'Paint fence']]);
    const rejected: RejectedOp[] = [
      { op: op('a', { type: 'task', id: 'task-1' }), code: 'forbidden', at: hlc },
      { op: op('b', { type: 'list', id: 'list-1' }), code: 'not-found', at: hlc },
      { op: op('c', { type: 'link', id: 'link-1' }), code: 'some-new-code' as never, at: hlc },
    ];
    expect(rejectedRows(state, rejected)).toEqual([
      { opId: 'a', title: 'Paint fence', errorKey: 'errors.forbidden' },
      { opId: 'b', title: 'House', errorKey: 'errors.not-found' },
      { opId: 'c', title: 'link-1', errorKey: 'errors.unknown' },
    ]);
  });

  test('a refused field says what was wrong with it', () => {
    const state = stateWith([], [['task-1', 'Paint fence']]);
    const rejected: RejectedOp[] = [
      {
        op: op('a', { type: 'task', id: 'task-1' }),
        code: 'invalid',
        errors: [{ field: 'title', code: 'too-long' }],
        at: hlc,
      },
    ];
    expect(rejectedRows(state, rejected)[0]?.errorKey).toBe('errors.too-long');
  });
});

describe('pageContent', () => {
  test('a record on the device is shown', () => {
    expect(pageContent(true, stateWith([['inbox', 'Inbox']]), 'inbox')).toBe('found');
  });

  test('before the first sync brings the default list, a missing record is loading', () => {
    expect(pageContent(false, stateWith([]), 'inbox')).toBe('loading');
  });

  test('once the default list is on the device, a missing record is not found', () => {
    expect(pageContent(false, stateWith([['inbox', 'Inbox']]), 'inbox')).toBe('not-found');
  });
});
