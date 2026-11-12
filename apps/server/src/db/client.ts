import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

export type Db = NodePgDatabase;

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

export const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

export function createDb(databaseUrl: string): DbHandle {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool });
  return { db, close: () => pool.end() };
}

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}
