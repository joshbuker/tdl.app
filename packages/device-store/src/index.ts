// Public API of @tdl/device-store.
import type { ReplicaStore } from '@tdl/sync';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { proxyExecutors, type SqlDriver } from './driver.ts';
import { SqliteKeyValue, type KeyValue } from './key-value.ts';
import { migrate } from './migrate.ts';
import { SqliteReplicaStore } from './sqlite-store.ts';

export type { SqlDriver, SqlMethod } from './driver.ts';
export type { KeyValue } from './key-value.ts';
export { migrate } from './migrate.ts';

/** Brings the device's database up to date, then returns its replica store and key-value store. */
export async function openDeviceStore(driver: SqlDriver): Promise<{ replicaStore: ReplicaStore; keyValue: KeyValue }> {
  await migrate(driver);
  const db = drizzle(proxyExecutors(driver));
  return { replicaStore: new SqliteReplicaStore(db), keyValue: new SqliteKeyValue(db) };
}
