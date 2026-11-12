import type { AccessData, Grant, Id, Link, List, Task } from '@tdl/domain';
import { compareHlc } from './hlc.ts';
import type { ContentChange, MetaChange, Operation } from './operations.ts';

export type AuthoredOperation = Operation & { authorId: Id };

export interface DeviceState {
  lists: Map<Id, List & { createdAt: string }>;
  tasks: Map<Id, Task & { createdAt: string }>;
  links: Map<Id, Link & { createdAt: string }>;
  grants: Map<Id, Grant>;
}

export interface HistoryEntry {
  opId: Id;
  hlc: string;
  authorId: Id;
  change: MetaChange | ContentChange;
  recordType: 'task' | 'link';
  recordId: Id;
}

/** HLC order, with ties (which should not happen) broken by operation id. */
function byHlc(a: Operation, b: Operation): number {
  return compareHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const createdAtOf = (hlc: string): string => new Date(Number(hlc.slice(0, 15))).toISOString();

function applyMeta(state: DeviceState, removed: Set<Id>, op: AuthoredOperation, meta: MetaChange): void {
  const { id } = op.record;
  const createdAt = createdAtOf(op.hlc);
  switch (meta.kind) {
    case 'createList':
      if (!state.lists.has(id)) {
        state.lists.set(id, { id, ownerId: op.authorId, title: '', editorsCanShare: false, createdAt });
      }
      break;
    case 'createTask':
      if (!state.tasks.has(id)) {
        state.tasks.set(id, { id, listId: meta.listId, title: '', notes: '', completedAt: null, createdAt });
      }
      break;
    case 'moveTask': {
      const task = state.tasks.get(id);
      if (task !== undefined) task.listId = meta.listId;
      break;
    }
    case 'createLink':
      if (!state.links.has(id) && !removed.has(id)) {
        state.links.set(id, {
          id,
          prerequisiteId: meta.prerequisiteId,
          postrequisiteId: meta.postrequisiteId,
          kind: 'hard',
          reason: '',
          createdAt,
        });
      }
      break;
    case 'removeLink':
      state.links.delete(id);
      removed.add(id);
      break;
    case 'grant':
      if (!state.grants.has(id) && !removed.has(id)) {
        state.grants.set(id, { id, userId: meta.userId, target: meta.target, role: meta.role });
      }
      break;
    case 'revokeGrant':
      state.grants.delete(id);
      removed.add(id);
      break;
  }
}

function applyContent(state: DeviceState, op: Operation, { field, value }: ContentChange): void {
  const { type, id } = op.record;
  if (type === 'task') {
    const task = state.tasks.get(id);
    if (task === undefined) return;
    if (field === 'title' && typeof value === 'string') task.title = value;
    else if (field === 'notes' && typeof value === 'string') task.notes = value;
    else if (field === 'completedAt' && (typeof value === 'string' || value === null)) task.completedAt = value;
  } else if (type === 'list') {
    const list = state.lists.get(id);
    if (list === undefined) return;
    if (field === 'title' && typeof value === 'string') list.title = value;
    else if (field === 'editorsCanShare' && typeof value === 'boolean') list.editorsCanShare = value;
  } else if (type === 'link') {
    const link = state.links.get(id);
    if (link === undefined) return;
    if (field === 'kind' && (value === 'hard' || value === 'soft')) link.kind = value;
    else if (field === 'reason' && typeof value === 'string') link.reason = value;
  }
}

/**
 * Pure. Metadata applies in HLC order; each content field takes its highest-HLC operation, so the
 * result does not depend on arrival order. Content for records with no create operation is ignored.
 */
export function materialize(ops: Iterable<AuthoredOperation>): DeviceState {
  const sorted = [...ops].sort(byHlc);
  const state: DeviceState = { lists: new Map(), tasks: new Map(), links: new Map(), grants: new Map() };
  const removed = new Set<Id>();
  for (const op of sorted) {
    if (op.meta !== null) applyMeta(state, removed, op, op.meta);
  }
  // Content in ascending order, so the last write to a field is the highest HLC.
  for (const op of sorted) {
    if (op.content !== null) applyContent(state, op, op.content);
  }
  return state;
}

export function accessData(state: DeviceState): AccessData {
  return { lists: state.lists, tasks: state.tasks, grants: [...state.grants.values()] };
}

/** The task's operations and those of every link whose createLink names it, in HLC order. */
export function historyOf(ops: Iterable<AuthoredOperation>, taskId: Id): HistoryEntry[] {
  const all = [...ops].sort(byHlc);
  const linkIds = new Set<Id>();
  for (const op of all) {
    const meta = op.meta;
    if (meta?.kind === 'createLink' && (meta.prerequisiteId === taskId || meta.postrequisiteId === taskId)) {
      linkIds.add(op.record.id);
    }
  }
  const entries: HistoryEntry[] = [];
  for (const op of all) {
    const change = op.meta ?? op.content;
    if (change === null) continue;
    const { type, id } = op.record;
    if ((type === 'task' && id === taskId) || (type === 'link' && linkIds.has(id))) {
      entries.push({ opId: op.id, hlc: op.hlc, authorId: op.authorId, change, recordType: type, recordId: id });
    }
  }
  return entries;
}
