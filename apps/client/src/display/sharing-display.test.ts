import type { Grant, Id } from '@tdl/domain';
import { materialize, type DeviceState } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { canEditTask, hasShareActions, listControls, shareView } from './sharing-display.ts';

const house = { kind: 'list', id: 'house' } as const;
const paintFence = { kind: 'task', id: 'fence' } as const;

/** Alice's list House with Paint fence, and the given grants. */
function stateWith(grants: Grant[], editorsCanShare = false): DeviceState {
  const state = materialize([]);
  state.lists.set('house', {
    id: 'house',
    ownerId: 'alice',
    title: 'House',
    editorsCanShare,
    createdAt: '',
  });
  state.tasks.set('fence', {
    id: 'fence',
    listId: 'house',
    title: 'Paint fence',
    notes: '',
    completedAt: null,
    createdAt: '',
  });
  for (const grant of grants) state.grants.set(grant.id, grant);
  return state;
}

const grant = (
  id: Id,
  userId: Id,
  role: Grant['role'],
  target: Grant['target'] = house,
): Grant => ({
  id,
  userId,
  target,
  role,
});

describe('shareView', () => {
  test('the owner invites, and can remove each collaborator', () => {
    const state = stateWith([grant('g1', 'bob', 'viewer'), grant('g2', 'carol', 'editor')]);
    expect(shareView(state, 'alice', house)).toEqual({
      canInvite: true,
      collaborators: [
        { grantId: 'g1', role: 'viewer', you: false, removable: true },
        { grantId: 'g2', role: 'editor', you: false, removable: true },
      ],
      leaveGrantIds: [],
    });
  });

  test("a grantee can't invite or remove others, and can leave", () => {
    const state = stateWith([grant('g1', 'bob', 'viewer'), grant('g2', 'carol', 'editor')]);
    expect(shareView(state, 'bob', house)).toEqual({
      canInvite: false,
      collaborators: [
        { grantId: 'g1', role: 'viewer', you: true, removable: false },
        { grantId: 'g2', role: 'editor', you: false, removable: false },
      ],
      leaveGrantIds: ['g1'],
    });
  });

  test('a task shows its own grants, and editors of the list share it only if allowed', () => {
    const grants = [grant('g1', 'bob', 'editor'), grant('t1', 'carol', 'viewer', paintFence)];
    expect(shareView(stateWith(grants), 'bob', paintFence)).toMatchObject({
      canInvite: false,
      collaborators: [{ grantId: 't1', role: 'viewer', you: false, removable: false }],
      leaveGrantIds: [],
    });
    expect(shareView(stateWith(grants, true), 'bob', paintFence).canInvite).toBe(true);
    expect(shareView(stateWith(grants), 'carol', paintFence).leaveGrantIds).toEqual(['t1']);
  });
});

describe('hasShareActions', () => {
  test('there is something to do when the user can invite, remove someone, or leave', () => {
    const grants = [grant('g1', 'bob', 'viewer'), grant('t1', 'carol', 'viewer', paintFence)];
    expect(hasShareActions(shareView(stateWith(grants), 'alice', paintFence))).toBe(true);
    expect(hasShareActions(shareView(stateWith(grants), 'carol', paintFence))).toBe(true);
    expect(hasShareActions(shareView(stateWith(grants), 'bob', paintFence))).toBe(false);
  });
});

describe('listControls', () => {
  test('the owner and editors add tasks; viewers and commenters only read', () => {
    const state = stateWith([
      grant('g1', 'bob', 'viewer'),
      grant('g2', 'carol', 'editor'),
      grant('g3', 'dave', 'commenter'),
    ]);
    expect(listControls(state, 'alice', 'house')).toEqual({ addTasks: true, share: true });
    expect(listControls(state, 'carol', 'house')).toEqual({ addTasks: true, share: true });
    expect(listControls(state, 'bob', 'house')).toEqual({ addTasks: false, share: true });
    expect(listControls(state, 'dave', 'house')).toEqual({ addTasks: false, share: true });
  });

  test('a list the user has no access to offers nothing', () => {
    expect(listControls(stateWith([]), 'bob', 'house')).toEqual({ addTasks: false, share: false });
  });
});

describe('canEditTask', () => {
  test('editors and the owner edit; a viewer does not', () => {
    const state = stateWith([grant('g1', 'bob', 'viewer'), grant('g2', 'carol', 'editor')]);
    expect(canEditTask(state, 'alice', 'fence')).toBe(true);
    expect(canEditTask(state, 'carol', 'fence')).toBe(true);
    expect(canEditTask(state, 'bob', 'fence')).toBe(false);
  });
});
