import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Operations, entries and values are kept as JSON text, as they came, so data a newer app version wrote
// (or a newer server sent) survives untouched.

/** The replica's one row: whose it is, and the last feed ID applied. No row means no replica. */
export const replica = sqliteTable('replica', {
  userId: text('user_id').notNull(),
  deviceId: text('device_id').notNull(),
  cursor: integer('cursor').notNull(),
});

/** Confirmed operations, in the order they arrived (by rowid). */
export const confirmedOps = sqliteTable('confirmed_ops', {
  id: text('id').primaryKey(),
  op: text('op').notNull(),
});

/** Pending operations, in the order they were made. */
export const pendingOps = sqliteTable('pending_ops', {
  position: integer('position').primaryKey({ autoIncrement: true }),
  id: text('id').notNull().unique(),
  op: text('op').notNull(),
});

/** Operations the server refused, by operation ID. */
export const rejectedOps = sqliteTable('rejected_ops', {
  opId: text('op_id').primaryKey(),
  rejected: text('rejected').notNull(),
});

/** Feed entries this version didn't understand, by feed entry ID. */
export const unknownEntries = sqliteTable('unknown_entries', {
  feedId: integer('feed_id').primaryKey(),
  raw: text('raw').notNull(),
});

/** Small app values (such as the session), kept beside the replica. */
export const keyValue = sqliteTable('key_value', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
