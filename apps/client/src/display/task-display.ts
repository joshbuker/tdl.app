import { buildGraph, findLoops, nextUpTaskIds, redundantLinkIds, type Id } from '@tdl/domain';
import { HLC_PATTERN, type DeviceState, type HistoryEntry } from '@tdl/sync';

// What the list and task pages show, worked out from the replica's state. The rules (next up,
// loops, redundant links) come from @tdl/domain; this module only picks and orders.

export interface ListRow {
  id: Id;
  title: string;
}

export interface TaskRow {
  id: Id;
  title: string;
  completed: boolean;
  nextUp: boolean;
}

export interface LinkRow {
  linkId: Id;
  /** The task at the other end of the link. */
  taskId: Id;
  title: string;
  inLoop: boolean;
  redundant: boolean;
}

export interface TaskLinks {
  prerequisites: LinkRow[];
  postrequisites: LinkRow[];
}

export interface TaskOption {
  value: Id;
  label: string;
}

export interface HistoryRow {
  entry: HistoryEntry;
  at: Date;
  mine: boolean;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The user's lists, by title. */
export function listRows(state: DeviceState): ListRow[] {
  return [...state.lists.values()]
    .map(({ id, title }) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title) || byText(a.id, b.id));
}

function graphOf(state: DeviceState) {
  return buildGraph(state.tasks.values(), state.links.values());
}

/** The list's tasks: incomplete first, then in the order they were created. */
export function taskRows(state: DeviceState, listId: Id): TaskRow[] {
  const nextUp = nextUpTaskIds(graphOf(state));
  return [...state.tasks.values()]
    .filter((task) => task.listId === listId)
    .sort(
      (a, b) =>
        Number(a.completedAt !== null) - Number(b.completedAt !== null) ||
        byText(a.createdAt, b.createdAt) ||
        byText(a.id, b.id),
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completedAt !== null,
      nextUp: nextUp.has(task.id),
    }));
}

/** The task's prerequisites and postrequisites, each flagged if it is part of a loop or redundant. */
export function taskLinks(state: DeviceState, taskId: Id): TaskLinks {
  const graph = graphOf(state);
  const inLoop = new Set(findLoops(graph).flatMap((loop) => loop.linkIds));
  const redundant = redundantLinkIds(graph);
  const row = (linkId: Id, otherId: Id): LinkRow => ({
    linkId,
    taskId: otherId,
    title: graph.tasks.get(otherId)?.title ?? '',
    inLoop: inLoop.has(linkId),
    redundant: redundant.has(linkId),
  });
  const byTitle = (a: LinkRow, b: LinkRow): number =>
    a.title.localeCompare(b.title) || byText(a.linkId, b.linkId);
  return {
    prerequisites: (graph.incoming.get(taskId) ?? [])
      .map((link) => row(link.id, link.prerequisiteId))
      .sort(byTitle),
    postrequisites: (graph.outgoing.get(taskId) ?? [])
      .map((link) => row(link.id, link.postrequisiteId))
      .sort(byTitle),
  };
}

/**
 * The tasks a user can pick as a prerequisite of `taskId`, by title, whose title contains
 * `search` (ignoring case). Whether a link is allowed is checked when it is added.
 */
export function taskOptions(state: DeviceState, taskId: Id, search = ''): TaskOption[] {
  const needle = search.trim().toLocaleLowerCase();
  return [...state.tasks.values()]
    .filter((task) => task.id !== taskId && task.title.toLocaleLowerCase().includes(needle))
    .map((task) => ({ value: task.id, label: task.title }))
    .sort((a, b) => a.label.localeCompare(b.label) || byText(a.value, b.value));
}

/** When an operation was made, from its HLC. */
export function hlcTime(hlc: string): Date {
  const match = HLC_PATTERN.exec(hlc);
  if (match === null) throw new Error('invalid-hlc');
  return new Date(Number(match[1]));
}

/** History entries, newest first, with their time and whether the user made them. */
export function historyRows(entries: readonly HistoryEntry[], userId: Id): HistoryRow[] {
  return [...entries]
    .reverse()
    .map((entry) => ({ entry, at: hlcTime(entry.hlc), mine: entry.authorId === userId }));
}
