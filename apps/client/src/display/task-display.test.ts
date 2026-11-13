import type { Id } from '@tdl/domain';
import type { DeviceState, HistoryEntry } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import {
  historyRows,
  hlcTime,
  listRows,
  taskLinks,
  taskOptions,
  taskRows,
} from './task-display.ts';

const at = (n: number): string => new Date(Date.UTC(2026, 10, 13, 0, 0, n)).toISOString();

function stateOf(
  tasks: { id: Id; title: string; listId?: Id; done?: boolean; createdAt?: string }[],
  links: [id: Id, prerequisiteId: Id, postrequisiteId: Id][] = [],
): DeviceState {
  const state: DeviceState = {
    lists: new Map(),
    tasks: new Map(),
    links: new Map(),
    grants: new Map(),
  };
  for (const [i, t] of tasks.entries()) {
    state.tasks.set(t.id, {
      id: t.id,
      listId: t.listId ?? 'inbox',
      title: t.title,
      notes: '',
      completedAt: t.done === true ? at(100) : null,
      createdAt: t.createdAt ?? at(i),
    });
  }
  for (const [id, prerequisiteId, postrequisiteId] of links) {
    state.links.set(id, {
      id,
      prerequisiteId,
      postrequisiteId,
      kind: 'hard',
      reason: '',
      createdAt: at(0),
    });
  }
  return state;
}

describe('listRows', () => {
  test('lists the lists by title', () => {
    const state = stateOf([]);
    for (const [id, title] of [
      ['l1', 'Shed'],
      ['l2', 'Inbox'],
    ] as const) {
      state.lists.set(id, { id, title, ownerId: 'u', editorsCanShare: false, createdAt: at(0) });
    }
    expect(listRows(state)).toEqual([
      { id: 'l2', title: 'Inbox' },
      { id: 'l1', title: 'Shed' },
    ]);
  });
});

describe('taskRows', () => {
  test("shows the list's tasks, incomplete first, then in creation order", () => {
    const state = stateOf([
      { id: 'a', title: 'A', done: true },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C', listId: 'other' },
      { id: 'd', title: 'D' },
    ]);
    expect(taskRows(state, 'inbox').map((row) => row.id)).toEqual(['b', 'd', 'a']);
  });

  test('marks next-up and completed tasks', () => {
    const state = stateOf(
      [
        { id: 'paint', title: 'Buy paint' },
        { id: 'fence', title: 'Paint fence' },
        { id: 'milk', title: 'Buy milk', done: true },
      ],
      [['l', 'paint', 'fence']],
    );
    expect(taskRows(state, 'inbox')).toEqual([
      { id: 'paint', title: 'Buy paint', completed: false, nextUp: true },
      { id: 'fence', title: 'Paint fence', completed: false, nextUp: false },
      { id: 'milk', title: 'Buy milk', completed: true, nextUp: false },
    ]);
  });
});

describe('taskLinks', () => {
  test('lists prerequisites and postrequisites with the task at the other end', () => {
    const state = stateOf(
      [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ],
      [
        ['ab', 'a', 'b'],
        ['bc', 'b', 'c'],
      ],
    );
    expect(taskLinks(state, 'b')).toEqual({
      prerequisites: [{ linkId: 'ab', taskId: 'a', title: 'A', inLoop: false, redundant: false }],
      postrequisites: [{ linkId: 'bc', taskId: 'c', title: 'C', inLoop: false, redundant: false }],
    });
  });

  test('flags redundant links', () => {
    const state = stateOf(
      [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ],
      [
        ['ab', 'a', 'b'],
        ['bc', 'b', 'c'],
        ['ac', 'a', 'c'],
      ],
    );
    expect(taskLinks(state, 'a').postrequisites).toEqual([
      { linkId: 'ab', taskId: 'b', title: 'B', inLoop: false, redundant: false },
      { linkId: 'ac', taskId: 'c', title: 'C', inLoop: false, redundant: true },
    ]);
  });

  test('flags links in a loop', () => {
    const state = stateOf(
      [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ],
      [
        ['ab', 'a', 'b'],
        ['ba', 'b', 'a'],
      ],
    );
    expect(taskLinks(state, 'a')).toEqual({
      prerequisites: [{ linkId: 'ba', taskId: 'b', title: 'B', inLoop: true, redundant: false }],
      postrequisites: [{ linkId: 'ab', taskId: 'b', title: 'B', inLoop: true, redundant: false }],
    });
  });
});

describe('taskOptions', () => {
  const state = stateOf([
    { id: 'b', title: 'Buy paint' },
    { id: 'a', title: 'Paint fence' },
    { id: 'm', title: 'Buy milk' },
  ]);

  test('offers the other tasks, by title', () => {
    expect(taskOptions(state, 'a')).toEqual([
      { value: 'm', label: 'Buy milk' },
      { value: 'b', label: 'Buy paint' },
    ]);
  });

  test('keeps the tasks whose title contains the search, ignoring case', () => {
    expect(taskOptions(state, 'm', ' PAINT ')).toEqual([
      { value: 'b', label: 'Buy paint' },
      { value: 'a', label: 'Paint fence' },
    ]);
  });
});

describe('hlcTime', () => {
  test('reads the time from an HLC', () => {
    expect(hlcTime('001763000000000:000003:device').toISOString()).toBe(
      new Date(1763000000000).toISOString(),
    );
  });

  test('refuses something that is not an HLC', () => {
    expect(() => hlcTime('nope')).toThrow('invalid-hlc');
  });
});

describe('historyRows', () => {
  const entry = (opId: string, ms: number, authorId: string): HistoryEntry => ({
    opId,
    hlc: `${String(ms).padStart(15, '0')}:000000:device`,
    authorId,
    change: { field: 'title', value: opId },
    recordType: 'task',
    recordId: 't',
  });

  test('lists entries newest first, marking the ones the user made', () => {
    const rows = historyRows([entry('first', 1000, 'me'), entry('second', 2000, 'bob')], 'me');
    expect(rows.map((row) => [row.entry.opId, row.at.getTime(), row.mine])).toEqual([
      ['second', 2000, false],
      ['first', 1000, true],
    ]);
  });
});
