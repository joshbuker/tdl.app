// The server for the web app's Playwright tests, exported as `@tdl/server/testing`.
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { eq, inArray } from 'drizzle-orm';
import { buildApp } from '../src/app.ts';
import { createDb, runMigrations, type Db } from '../src/db/client.ts';
import { operations, session, user } from '../src/db/schema.ts';
import { testConfig } from './test-config.ts';

export { createDb, type Db };

export interface E2eServer {
  /** Where the server listens, e.g. http://127.0.0.1:41234. Also its configured origin. */
  url: string;
  /** The database, for test processes that open their own connection (see `createDb`). */
  databaseUrl: string;
  db: Db;
  close(): Promise<void>;
}

/** A free TCP port on 127.0.0.1. The server's origin must be known before it listens. */
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((done, fail) => {
    probe.once('error', fail);
    probe.listen(0, '127.0.0.1', done);
  });
  const address = probe.address();
  await new Promise<void>((done) => {
    probe.close(() => {
      done();
    });
  });
  if (address === null || typeof address === 'string') throw new Error('no-port');
  return address.port;
}

/**
 * A Postgres 18 container, migrated, and the server serving the built web app from `webRoot`,
 * listening on 127.0.0.1 on a free port.
 */
export async function startE2eServer(options: { webRoot: string }): Promise<E2eServer> {
  const container = await new PostgreSqlContainer('postgres:18').start();
  const databaseUrl = container.getConnectionUri();
  const handle = createDb(databaseUrl);
  try {
    await runMigrations(handle.db);
    const port = await freePort();
    const url = `http://127.0.0.1:${String(port)}`;
    const config = { ...testConfig(databaseUrl), port, origin: url, webRoot: resolve(options.webRoot) };
    const app = await buildApp(config, { db: handle.db });
    await app.listen({ host: '127.0.0.1', port });
    return {
      url,
      databaseUrl,
      db: handle.db,
      close: async () => {
        await app.close();
        await handle.close();
        await container.stop();
      },
    };
  } catch (error) {
    await handle.close();
    await container.stop();
    throw error;
  }
}

/** Moves the expiry of every session of `username` into the past, as if they had lapsed. */
export async function expireSessions(db: Db, username: string): Promise<void> {
  const users = db.select({ id: user.id }).from(user).where(eq(user.username, username));
  await db
    .update(session)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(inArray(session.userId, users));
}

/** The content changes the server holds for one record, in the order it received them. */
export async function contentChangesOf(db: Db, recordId: string): Promise<unknown[]> {
  const rows = await db
    .select({ content: operations.content })
    .from(operations)
    .where(eq(operations.recordId, recordId))
    .orderBy(operations.seq);
  return rows.map((row) => row.content).filter((content) => content !== null);
}
