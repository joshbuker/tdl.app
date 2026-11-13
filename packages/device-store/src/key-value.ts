import type { JsonValue } from '@tdl/sync';
import { eq } from 'drizzle-orm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { keyValue } from './schema.ts';

/** Small app values kept on the device beside the replica. */
export interface KeyValue {
  /** The stored value, or null if there is none. */
  get(key: string): Promise<JsonValue | null>;
  set(key: string, value: JsonValue): Promise<void>;
  /** Removes every value. */
  clear(): Promise<void>;
}

export class SqliteKeyValue implements KeyValue {
  private readonly db: SqliteRemoteDatabase;

  constructor(db: SqliteRemoteDatabase) {
    this.db = db;
  }

  async get(key: string): Promise<JsonValue | null> {
    const row = await this.db.select({ value: keyValue.value }).from(keyValue).where(eq(keyValue.key, key)).get();
    return row === undefined ? null : JSON.parse(row.value) as JsonValue;
  }

  async set(key: string, value: JsonValue): Promise<void> {
    const text = JSON.stringify(value);
    await this.db.insert(keyValue).values({ key, value: text }).onConflictDoUpdate({ target: keyValue.key, set: { value: text } });
  }

  async clear(): Promise<void> {
    await this.db.delete(keyValue);
  }
}
