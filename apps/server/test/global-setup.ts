import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string;
  }
}

/** Starts one Postgres container for the whole run; each test file creates its own database in it. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer('postgres:18').start();
  project.provide('postgresUrl', container.getConnectionUri());
  return async () => {
    await container.stop();
  };
}
