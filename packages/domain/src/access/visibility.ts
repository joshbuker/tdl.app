import type { Id, Link } from '../model.ts';
import { listRole, visibleTaskIds, type AccessData } from './resolver.ts';

type LinkEnds = Pick<Link, 'id' | 'prerequisiteId' | 'postrequisiteId'>;

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
  const key = { list: 'lists', task: 'tasks', link: 'links', grant: 'grants' } as const;
  const audience = new Set<Id>();
  for (const userId of candidates) {
    if (visibleRecords(data, linkList, userId)[key[record.type]].has(record.id)) audience.add(userId);
  }
  return audience;
}
