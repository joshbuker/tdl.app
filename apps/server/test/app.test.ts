import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { testApp } from './db.ts';

describe('server skeleton', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    server = await testApp();
    // Routes must exist before the first request makes the app start.
    server.app.get('/limited', { config: { rateLimit: { max: 1, timeWindow: '1 minute' } } }, () => ({ ok: true }));
    server.app
      .withTypeProvider<ZodTypeProvider>()
      .post('/echo', { schema: { body: z.object({ title: z.string() }) } }, () => ({ ok: true }));
    server.app.post('/raw', () => ({ ok: true }));
  });
  afterAll(async () => {
    await server.close();
  });

  test('GET /health answers ok', async () => {
    const response = await server.app.inject({ url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  test('the API lives under /api: GET /me is 404, and GET /api/me without a session is 401', async () => {
    expect((await server.app.inject({ url: '/me' })).statusCode).toBe(404);
    const response = await server.app.inject({ url: '/api/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'session-expired' });
  });

  test('an unknown route answers 404 not-found', async () => {
    const response = await server.app.inject({ url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
  });

  test('a rate-limited route answers 429 rate-limited with Retry-After', async () => {
    expect((await server.app.inject({ url: '/limited' })).statusCode).toBe(200);
    const response = await server.app.inject({ url: '/limited' });
    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ code: 'rate-limited' });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  test('invalid input answers 422 with the offending fields', async () => {
    const response = await server.app.inject({ method: 'POST', url: '/echo', payload: { title: 1 } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ code: 'invalid', errors: [{ field: 'title', code: 'invalid' }] });
  });

  test('other client errors keep their status', async () => {
    const response = await server.app.inject({ method: 'POST', url: '/raw', headers: { 'content-type': 'application/json' }, payload: '{bad' });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'bad-request' });
  });

  test('CORS allows our origin and the app origins, without credentials, and exposes the protocol and token headers', async () => {
    for (const origin of ['http://localhost:3000', 'https://localhost', 'capacitor://localhost']) {
      const preflight = await server.app.inject({
        method: 'OPTIONS',
        url: '/api/sync/pull',
        headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization,tdl-protocol' },
      });
      expect(preflight.headers['access-control-allow-origin']).toBe(origin);
      expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();
      expect(preflight.headers['access-control-allow-headers']).toBe('content-type, authorization, tdl-protocol');
    }
    const response = await server.app.inject({ url: '/health', headers: { origin: 'https://localhost' } });
    expect(response.headers['access-control-expose-headers']).toBe('tdl-protocol, set-auth-token');
    const foreign = await server.app.inject({ url: '/health', headers: { origin: 'https://evil.example' } });
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('migrations create the schema', async () => {
    const result = await server.db.execute<{ n: number }>("select count(*)::int as n from information_schema.tables where table_name = 'operations'");
    expect(result.rows[0]).toEqual({ n: 1 });
  });
});

describe('serving the web app', () => {
  const html = { accept: 'text/html' };
  let webRoot: string;
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    webRoot = mkdtempSync(join(tmpdir(), 'tdl-web-'));
    mkdirSync(join(webRoot, 'assets'));
    writeFileSync(join(webRoot, 'index.html'), '<div id="q-app"></div>');
    writeFileSync(join(webRoot, 'assets', 'app.js'), 'console.log(1);');
    server = await testApp({ webRoot });
  });
  afterAll(async () => {
    await server.close();
    rmSync(webRoot, { recursive: true, force: true });
  });

  test('GET / answers the index', async () => {
    const response = await server.app.inject({ url: '/', headers: html });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('<div id="q-app">');
  });

  test('a route of the app answers the index', async () => {
    const response = await server.app.inject({ url: '/lists/123', headers: html });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<div id="q-app">');
  });

  test('a file answers itself', async () => {
    const response = await server.app.inject({ url: '/assets/app.js' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('console.log(1);');
  });

  test('an unknown API path answers 404 JSON, even to a browser', async () => {
    const response = await server.app.inject({ url: '/api/nope', headers: html });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
  });

  test('a path that is not for HTML answers 404 JSON', async () => {
    const response = await server.app.inject({ url: '/lists/123', headers: { accept: 'application/json' } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
  });

  test('a missing file with an extension answers 404 JSON', async () => {
    const response = await server.app.inject({ url: '/assets/gone.js', headers: { accept: '*/*' } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
  });

  test('the CSP lets the SQLite worker and Wasm run from the same origin', async () => {
    const csp = (await server.app.inject({ url: '/', headers: html })).headers['content-security-policy'] as string;
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  test('a server without a web root serves no pages', async () => {
    const bare = await testApp();
    try {
      expect((await bare.app.inject({ url: '/', headers: html })).statusCode).toBe(404);
    } finally {
      await bare.close();
    }
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
      appOrigins: ['https://localhost', 'capacitor://localhost'],
    });
  });

  test('reads APP_ORIGINS as a comma-separated list', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'x'.repeat(32), APP_ORIGINS: 'https://localhost, app://desktop ,' });
    expect(config.appOrigins).toEqual(['https://localhost', 'app://desktop']);
  });

  test('reads WEB_ROOT, which is optional', () => {
    const env = { DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'x'.repeat(32) };
    expect(loadConfig(env).webRoot).toBeUndefined();
    expect(loadConfig({ ...env, WEB_ROOT: '/app/web' }).webRoot).toBe('/app/web');
  });

  test('rejects a short auth secret', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
  });
});
