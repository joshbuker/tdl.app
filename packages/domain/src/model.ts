export type Id = string;

export interface Task {
  id: Id;
  listId: Id;
  title: string;
  notes: string;
  /** When the task was completed, as an ISO instant, or null if incomplete. */
  completedAt: string | null;
}

export interface List {
  id: Id;
  ownerId: Id;
  title: string;
  editorsCanShare: boolean;
}

export type LinkKind = 'hard' | 'soft';

/** "prerequisite must be done before postrequisite". */
export interface Link {
  id: Id;
  prerequisiteId: Id;
  postrequisiteId: Id;
  kind: LinkKind;
  reason: string;
}

export type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface Grant {
  /** The grant record's ID. */
  id: Id;
  userId: Id;
  target: { kind: 'list' | 'task'; id: Id };
  role: Exclude<Role, 'owner'>;
}
