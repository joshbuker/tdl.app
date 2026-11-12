import type { Id, Link } from '../model.ts';
import { listRole, visibleTaskIds, type AccessData } from './resolver.ts';

type LinkEnds = Pick<Link, 'id' | 'prerequisiteId' | 'postrequisiteId'>;

const SET_OF = { list: 'lists', task: 'tasks', link: 'links', grant: 'grants' } as const;

export interface VisibleRecords {
  lists: Set<Id>;
  tasks: Set<Id>;
  links: Set<Id>;
  grants: Set<Id>;
}

/** Every record the user may see: lists they have a role on, visible tasks, links between visible tasks, and relevant grants. */
export function visibleRecords(data: AccessData, links: Iterable<LinkEnds>, userId: Id): VisibleRecords {
  const lists = new Set<Id>();
  for (const id of data.lists.keys()) {
    if (listRole(data, userId, id) !== null) lists.add(id);
  }
  const tasks = visibleTaskIds(data, userId);
  const visibleLinks = new Set<Id>();
  for (const link of links) {
    if (tasks.has(link.prerequisiteId) && tasks.has(link.postrequisiteId)) visibleLinks.add(link.id);
  }
  const grants = new Set<Id>();
  for (const grant of data.grants) {
    const listId = grant.target.kind === 'list' ? grant.target.id : data.tasks.get(grant.target.id)?.listId;
    const ownsTarget = listId !== undefined && data.lists.get(listId)?.ownerId === userId;
    if (grant.userId === userId || ownsTarget) grants.add(grant.id);
  }
  return { lists, tasks, links: visibleLinks, grants };
}

/** The users for whom `visibleRecords` contains the record. Candidates are the owners and grantees in `data`. */
export function audienceOf(
  data: AccessData,
  links: Iterable<LinkEnds>,
  record: { type: 'list' | 'task' | 'link' | 'grant'; id: Id },
): Set<Id> {
  const candidates = new Set<Id>();
  for (const list of data.lists.values()) candidates.add(list.ownerId);
  for (const grant of data.grants) candidates.add(grant.userId);
  const linkList = [...links];
  const audience = new Set<Id>();
  for (const userId of candidates) {
    if (visibleRecords(data, linkList, userId)[SET_OF[record.type]].has(record.id)) audience.add(userId);
  }
  return audience;
}

/** A record by type and ID. */
export interface RecordKey {
  type: 'list' | 'task' | 'link' | 'grant';
  id: Id;
}

// Forget order: what refers to a record goes before it.
const FORGET_ORDER = ['grant', 'link', 'task', 'list'] as const;

/**
 * What the user gains and loses between two states. `lost` is in forget order: grants, links,
 * tasks, lists, each by ID. `gained` is unordered (its history is merged by sequence number).
 */
export function visibilityChange(before: AccessData, after: AccessData, links: Iterable<LinkEnds>, userId: Id): { gained: RecordKey[]; lost: RecordKey[] } {
  const linkList = [...links];
  const was = visibleRecords(before, linkList, userId);
  const is = visibleRecords(after, linkList, userId);
  const difference = (a: VisibleRecords, b: VisibleRecords): RecordKey[] =>
    FORGET_ORDER.flatMap((type) => [...a[SET_OF[type]]].filter((id) => !b[SET_OF[type]].has(id)).sort().map((id) => ({ type, id })));
  return { gained: difference(is, was), lost: difference(was, is) };
}
