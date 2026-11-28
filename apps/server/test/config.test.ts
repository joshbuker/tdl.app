import { describe, expect, test } from 'vitest';
import { loadConfig, normaliseOrigin } from '../src/config.ts';

const env = { DATABASE_URL: 'postgres://x', ORIGIN: 'https://tdl.app', AUTH_SECRET: 'x'.repeat(32) };

describe('normaliseOrigin', () => {
  test('trims, drops one trailing slash, and lower-cases the scheme and host', () => {
    expect(normaliseOrigin('https://tdl.app/')).toBe('https://tdl.app');
    expect(normaliseOrigin(' TDL://app ')).toBe('tdl://app');
    expect(normaliseOrigin('capacitor://localhost')).toBe('capacitor://localhost');
  });
});

describe('loadConfig', () => {
  test('names the missing variables', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL.*AUTH_SECRET|AUTH_SECRET.*DATABASE_URL/);
  });

  test('applies defaults', () => {
    expect(loadConfig(env)).toEqual({
      databaseUrl: 'postgres://x',
      port: 3000,
      origin: 'https://tdl.app',
      authSecret: 'x'.repeat(32),
      trustProxy: false,
      appOrigins: ['https://localhost', 'capacitor://localhost', 'tdl://app'],
    });
  });

  test('reads APP_ORIGINS as a comma-separated list', () => {
    const config = loadConfig({ ...env, APP_ORIGINS: 'https://localhost, app://desktop ,' });
    expect(config.appOrigins).toEqual(['https://localhost', 'app://desktop']);
  });

  test('normalises APP_ORIGINS and ORIGIN', () => {
    expect(loadConfig({ ...env, APP_ORIGINS: 'https://a.example/, TDL://App' }).appOrigins).toEqual(['https://a.example', 'tdl://app']);
    expect(loadConfig({ ...env, ORIGIN: 'https://TDL.app/' }).origin).toBe('https://tdl.app');
  });

  test('reads WEB_ROOT, which is optional', () => {
    expect(loadConfig(env).webRoot).toBeUndefined();
    expect(loadConfig({ ...env, WEB_ROOT: '/app/web' }).webRoot).toBe('/app/web');
  });

  test('rejects a short auth secret', () => {
    expect(() => loadConfig({ ...env, AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
  });
});
