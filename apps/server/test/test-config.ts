import type { Config } from '../src/config.ts';

/** A server configuration for tests. Plain, so code outside Vitest (the e2e server) can use it. */
export const testConfig = (databaseUrl: string): Config => ({
  databaseUrl,
  port: 0,
  origin: 'http://localhost:3000',
  authSecret: 'test-secret-test-secret-test-secret-0123',
  trustProxy: false,
  appOrigins: ['https://localhost', 'capacitor://localhost'],
});
