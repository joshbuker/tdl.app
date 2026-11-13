import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { auth, bearerOf, logIn, signUp } from './auth-helpers.ts';
import { testApp } from './db.ts';

interface SessionView {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
  current: boolean;
}

describe('sessions', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    server = await testApp();
    await signUp(server.app, 'alice');
    await signUp(server.app, 'bob');
  });
  afterAll(async () => {
    await server.close();
  });

  const loginAs = async (username: string, userAgent: string) => bearerOf((await logIn(server.app, username, undefined, userAgent)).headers);
  const me = (token: string) => server.app.inject({ url: '/api/me', headers: auth(token) });
  const sessions = async (token: string) => {
    const response = await server.app.inject({ url: '/api/sessions', headers: auth(token) });
    expect(response.statusCode).toBe(200);
    return response.json<SessionView[]>();
  };

  test('two logins list two sessions, one current', async () => {
    const phone = await loginAs('alice', 'phone');
    const laptop = await loginAs('alice', 'laptop');
    const list = await sessions(laptop);
    const mine = list.filter((s) => s.userAgent === 'phone' || s.userAgent === 'laptop');
    expect(mine).toHaveLength(2);
    expect(list.filter((s) => s.current)).toEqual([expect.objectContaining({ userAgent: 'laptop', lastSyncedAt: null }) as unknown]);
    expect(Date.parse(list[0]?.createdAt ?? '')).not.toBeNaN();
    // Each user sees only their own sessions.
    expect((await sessions(phone)).map((s) => s.id).sort()).toEqual(list.map((s) => s.id).sort());
  });

  test('revoking the phone from the laptop: the phone gets session-revoked, the laptop still works', async () => {
    const phone = await loginAs('alice', 'phone 2');
    const laptop = await loginAs('alice', 'laptop 2');
    const phoneSession = (await sessions(laptop)).find((s) => s.userAgent === 'phone 2');
    expect(phoneSession).toBeDefined();

    const revoke = await server.app.inject({ method: 'DELETE', url: `/api/sessions/${phoneSession?.id ?? ''}`, headers: auth(laptop) });
    expect(revoke.statusCode).toBe(204);

    const phoneMe = await me(phone);
    expect(phoneMe.statusCode).toBe(401);
    expect(phoneMe.json()).toEqual({ code: 'session-revoked' });
    expect((await me(laptop)).statusCode).toBe(200);
    expect((await sessions(laptop)).some((s) => s.id === phoneSession?.id)).toBe(false);
  });

  test('a revoked cookie session also gets session-revoked', async () => {
    const phoneLogin = await logIn(server.app, 'alice', undefined, 'phone 3');
    const cookie = phoneLogin.cookies.find((c) => c.name.endsWith('session_token'));
    const laptop = await loginAs('alice', 'laptop 3');
    const phoneSession = (await sessions(laptop)).find((s) => s.userAgent === 'phone 3');
    await server.app.inject({ method: 'DELETE', url: `/api/sessions/${phoneSession?.id ?? ''}`, headers: auth(laptop) });

    const response = await server.app.inject({ url: '/api/me', cookies: { [cookie?.name ?? '']: cookie?.value ?? '' } });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'session-revoked' });
  });

  test('after sign-out the old token gets session-expired', async () => {
    const token = await loginAs('alice', 'tablet');
    const signOut = await server.app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: auth(token) });
    expect(signOut.statusCode).toBe(200);
    const response = await me(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'session-expired' });
  });

  test('an expired session gets session-expired', async () => {
    const token = await loginAs('alice', 'old phone');
    await server.db.execute(sql`update session set expires_at = now() - interval '1 minute' where user_agent = 'old phone'`);
    const response = await me(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'session-expired' });
  });

  test("revoking another user's session gives 404", async () => {
    const alice = await loginAs('alice', 'desktop');
    const bob = await loginAs('bob', 'bob phone');
    const bobSession = (await sessions(bob)).find((s) => s.current);
    const response = await server.app.inject({ method: 'DELETE', url: `/api/sessions/${bobSession?.id ?? ''}`, headers: auth(alice) });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not-found' });
    expect((await me(bob)).statusCode).toBe(200);

    const malformed = await server.app.inject({ method: 'DELETE', url: '/api/sessions/not-a-uuid', headers: auth(alice) });
    expect(malformed.statusCode).toBe(404);
  });

  test('a request with no token gets session-expired', async () => {
    const response = await server.app.inject({ url: '/api/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'session-expired' });
  });

  test('a garbage token gets session-expired', async () => {
    const response = await me('garbage.token');
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'session-expired' });
  });
});
