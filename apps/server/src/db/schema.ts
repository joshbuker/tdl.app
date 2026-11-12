import {
  bigint,
  bigserial,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const now = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

// Better Auth's tables, hand-written from its documented Drizzle schema (core tables, the username
// plugin's columns, and our additional fields). Better Auth must generate UUID ids
// (`advanced.database.generateId: 'uuid'`) to match these columns.
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: now('created_at'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  givenName: text('given_name').notNull(),
  familyName: text('family_name').notNull(),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  defaultListId: uuid('default_list_id'),
});

export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: now('created_at'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: now('created_at'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: now('created_at'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.identifier)],
);

/** Better Auth deletes a session on logout; this remembers revoked tokens so they answer `session-revoked`. */
export const revokedSessions = pgTable('revoked_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  revokedAt: now('revoked_at'),
});

export const lists = pgTable('lists', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => user.id),
  editorsCanShare: boolean('editors_can_share').notNull().default(false),
});

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id),
  },
  (t) => [index().on(t.listId)],
);

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey(),
    prerequisiteId: uuid('prerequisite_id')
      .notNull()
      .references(() => tasks.id),
    postrequisiteId: uuid('postrequisite_id')
      .notNull()
      .references(() => tasks.id),
  },
  (t) => [unique().on(t.prerequisiteId, t.postrequisiteId), index().on(t.postrequisiteId)],
);

export const grants = pgTable(
  'grants',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    targetKind: text('target_kind').notNull(),
    targetId: uuid('target_id').notNull(),
    role: text('role').notNull(),
  },
  (t) => [index().on(t.userId), index().on(t.targetKind, t.targetId)],
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey(),
    inviterId: uuid('inviter_id')
      .notNull()
      .references(() => user.id),
    inviteeId: uuid('invitee_id')
      .notNull()
      .references(() => user.id),
    targetKind: text('target_kind').notNull(),
    targetId: uuid('target_id').notNull(),
    role: text('role').notNull(),
    createdAt: now('created_at'),
  },
  (t) => [index().on(t.inviteeId)],
);

export const operations = pgTable(
  'operations',
  {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    id: uuid('id').notNull().unique(),
    hlc: text('hlc').notNull(),
    recordType: text('record_type').notNull(),
    recordId: uuid('record_id').notNull(),
    meta: jsonb('meta'),
    content: jsonb('content'),
    authorId: uuid('author_id')
      .notNull()
      .references(() => user.id),
    sessionId: uuid('session_id'),
    receivedAt: now('received_at'),
  },
  (t) => [index().on(t.recordType, t.recordId)],
);

export const feed = pgTable(
  'feed',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    kind: text('kind').notNull(),
    opSeq: bigint('op_seq', { mode: 'number' }),
    recordType: text('record_type').notNull(),
    recordId: uuid('record_id').notNull(),
  },
  (t) => [index().on(t.userId, t.id)],
);
