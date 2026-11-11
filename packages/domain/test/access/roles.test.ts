import { describe, expect, test } from 'vitest';
import { roleAllows, type Action } from '../../src/access/roles.ts';
import type { Role } from '../../src/model.ts';

const sharing = { editorsCanShare: true };
const noSharing = { editorsCanShare: false };

// One row per cell of the table in docs/features/app/sharing.md, "What each role can do":
// [role, action, via, editorsCanShare, allowed]
const cells: [Role, Action, 'list' | 'task', boolean, boolean][] = [
  ['owner', 'view', 'list', false, true],
  ['editor', 'view', 'task', false, true],
  ['commenter', 'view', 'task', false, true],
  ['viewer', 'view', 'list', false, true],

  ['owner', 'comment', 'list', false, true],
  ['editor', 'comment', 'task', false, true],
  ['commenter', 'comment', 'list', false, true],
  ['commenter', 'comment', 'task', false, true],
  ['viewer', 'comment', 'list', false, false],

  ['owner', 'edit', 'list', false, true],
  ['editor', 'edit', 'list', false, true],
  ['editor', 'edit', 'task', false, true],
  ['commenter', 'edit', 'list', false, false],
  ['viewer', 'edit', 'list', false, false],

  ['owner', 'addTask', 'list', false, true],
  ['editor', 'addTask', 'list', false, true],
  ['editor', 'addTask', 'task', false, false],
  ['commenter', 'addTask', 'list', false, false],
  ['viewer', 'addTask', 'list', false, false],

  ['owner', 'deleteTask', 'list', false, true],
  ['editor', 'deleteTask', 'list', false, true],
  ['editor', 'deleteTask', 'task', false, false],
  ['commenter', 'deleteTask', 'list', false, false],
  ['viewer', 'deleteTask', 'list', false, false],

  ['owner', 'shareTask', 'list', false, true],
  ['editor', 'shareTask', 'list', true, true],
  ['editor', 'shareTask', 'list', false, false],
  ['editor', 'shareTask', 'task', true, false],
  ['commenter', 'shareTask', 'list', true, false],
  ['viewer', 'shareTask', 'list', true, false],

  ['owner', 'manageAccess', 'list', false, true],
  ['editor', 'manageAccess', 'list', true, false],
  ['commenter', 'manageAccess', 'list', false, false],
  ['viewer', 'manageAccess', 'list', false, false],
];

describe('roleAllows', () => {
  test.each(cells)('%s %s via %s (editors can share: %s) → %s', (role, action, via, canShare, allowed) => {
    expect(roleAllows(role, action, via, canShare ? sharing : noSharing)).toBe(allowed);
  });
});
