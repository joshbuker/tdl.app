import { fileURLToPath } from 'node:url';
import { startE2eServer } from '@tdl/server/testing';

/**
 * Starts the server with Postgres, serving the app built in dist/spa (built beforehand, by
 * `pnpm test:e2e` or CI). Tests read its URL and database from the environment.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = await startE2eServer({
    webRoot: fileURLToPath(new URL('../dist/spa', import.meta.url)),
  });
  process.env.TDL_E2E_BASE_URL = server.url;
  process.env.TDL_E2E_DATABASE_URL = server.databaseUrl;
  return () => server.close();
}
