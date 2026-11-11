import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { testApp } from './db.ts';

describe('server skeleton', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    server = await testApp();
  });
  afterAll(async () => {
    await server.close();
  });

  test('GET /health answers ok', async () => {
    const response = await server.app.inject({ url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  test('an unknown route answers 404 not-found', async () => {
    const response = await server.app.inject({ url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
  });

  test('migrations create the schema', async () => {
    const result = await server.db.execute<{ n: number }>("select count(*)::int as n from information_schema.tables where table_name = 'operations'");
    expect(result.rows[0]).toEqual({ n: 1 });
  });
});

describe('loadConfig', () => {
  test('names the missing variables', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL.*AUTH_SECRET|AUTH_SECRET.*DATABASE_URL/);
  });

  test('applies defaults', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'x'.repeat(32) });
    expect(config).toEqual({
      databaseUrl: 'postgres://x',
      port: 3000,
      origin: 'https://tdl.app',
      authSecret: 'x'.repeat(32),
      trustProxy: false,
    });
  });

  test('rejects a short auth secret', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
  });
});
