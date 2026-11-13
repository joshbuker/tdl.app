import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { buildApp } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import { createDb, runMigrations, type Db } from '../src/db/client.ts';
import { testConfig } from './test-config.ts';

export interface TestDb {
  db: Db;
  url: string;
  close: () => Promise<void>;
}

/** A fresh, migrated database in the shared container. */
export async function testDb(): Promise<TestDb> {
  const adminUrl = inject('postgresUrl');
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const handle = createDb(url.toString());
  try {
    await runMigrations(handle.db);
  } catch (error) {
    await handle.close();
    throw error;
  }
  return { db: handle.db, url: url.toString(), close: handle.close };
}

export { testConfig };

export async function testApp(overrides: Partial<Config> = {}) {
  const database = await testDb();
  const app = await buildApp({ ...testConfig(database.url), ...overrides }, { db: database.db });
  return {
    app,
    ...database,
    close: async () => {
      await app.close();
      await database.close();
    },
  };
}
