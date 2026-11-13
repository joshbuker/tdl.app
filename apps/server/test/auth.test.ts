import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { auth, bearerOf, logIn, PASSWORD, signUp, signUpInput, signUpRequest } from './auth-helpers.ts';
import { testApp } from './db.ts';

describe('accounts', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    server = await testApp();
  });
  afterAll(async () => {
    await server.close();
  });

  const invalid = async (payload: Record<string, unknown>) => {
    const response = await signUpRequest(server.app, payload);
    expect(response.statusCode).toBe(422);
    return response.json<{ code: string; errors: unknown[] }>();
  };

  describe('sign-up', () => {
    let aliceToken: string;
    beforeAll(async () => {
      aliceToken = await signUp(server.app, 'alice');
    });

    test('signing up gives a token, and /api/me has the username and an Inbox as the default list', async () => {
      const me = await server.app.inject({ url: '/api/me', headers: auth(aliceToken) });
      expect(me.statusCode).toBe(200);
      const body = me.json<{ userId: string; username: string; defaultListId: string }>();
      expect(body.username).toBe('alice');
      expect(body.defaultListId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.userId).toMatch(/^[0-9a-f-]{36}$/);

      const feed = await server.db.execute<{ author_id: string; record_type: string; record_id: string; meta: unknown; content: unknown; hlc: string }>(sql`
        select o.author_id, o.record_type, o.record_id, o.meta, o.content, o.hlc
        from feed f join operations o on o.seq = f.op_seq
        where f.user_id = ${body.userId} and f.kind = 'op'
        order by f.id`);
      expect(feed.rows).toEqual([
        { author_id: body.userId, record_type: 'list', record_id: body.defaultListId, meta: { kind: 'createList' }, content: null, hlc: expect.stringMatching(/:server$/) as unknown },
        { author_id: body.userId, record_type: 'list', record_id: body.defaultListId, meta: null, content: { field: 'title', value: 'Inbox' }, hlc: expect.stringMatching(/:server$/) as unknown },
      ]);
      const list = await server.db.execute<{ owner_id: string }>(sql`select owner_id from lists where id = ${body.defaultListId}`);
      expect(list.rows).toEqual([{ owner_id: body.userId }]);
    });

    test('the time the terms were accepted is recorded', async () => {
      const result = await server.db.execute<{ accepted: boolean }>(
        sql`select terms_accepted_at between now() - interval '1 minute' and now() as accepted from "user" where username = 'alice'`,
      );
      expect(result.rows).toEqual([{ accepted: true }]);
    });

    test('an uppercase email gives 422 uppercase', async () => {
      expect(await invalid({ ...signUpInput('bob', { email: 'Alice@Example.com' }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'email', code: 'uppercase' }],
      });
    });

    test('a 13-character password gives 422 too-short', async () => {
      expect(await invalid({ ...signUpInput('bob', { password: 'a'.repeat(13) }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'password', code: 'too-short' }],
      });
    });

    test('the username ALICE after alice exists gives 422 taken', async () => {
      expect(await invalid({ ...signUpInput('ALICE', { email: 'other@example.com' }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'username', code: 'taken' }],
      });
    });

    test('an email already used gives 422 taken', async () => {
      expect(await invalid({ ...signUpInput('alice2', { email: 'alice@example.com' }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'email', code: 'taken' }],
      });
    });

    test('terms not accepted gives 422 required', async () => {
      expect(await invalid({ ...signUpInput('bob', { acceptTerms: 'yes' }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'acceptTerms', code: 'required' }],
      });
    });

    test('missing or non-string fields give 422 required or invalid, never a crash', async () => {
      expect(await invalid({ ...signUpInput('bob'), username: undefined, givenName: 42 })).toEqual({
        code: 'invalid',
        errors: [
          { field: 'username', code: 'required' },
          { field: 'givenName', code: 'invalid' },
        ],
      });
    });

    test('fields other than the account details give 422 unknown-field, and nothing is stored', async () => {
      expect(await invalid({ ...signUpInput('mallory'), displayUsername: 'alice', image: 'https://example.com/x.png' })).toEqual({
        code: 'invalid',
        errors: [
          { field: 'displayUsername', code: 'unknown-field' },
          { field: 'image', code: 'unknown-field' },
        ],
      });
      const users = await server.db.execute<{ n: number }>(sql`select count(*)::int as n from "user" where username = 'mallory'`);
      expect(users.rows).toEqual([{ n: 0 }]);
    });

    test('the stored name comes from the validated given and family names, never from the client', async () => {
      const token = await signUp(server.app, 'frank', { name: 'x'.repeat(10_000), givenName: '  Frank ', familyName: ' Example  ' });
      const me = await server.app.inject({ url: '/api/me', headers: auth(token) });
      expect(me.json()).toMatchObject({ username: 'frank' });
      const result = await server.db.execute<{ name: string; display_username: string; given_name: string; family_name: string; image: string | null }>(
        sql`select name, display_username, given_name, family_name, image from "user" where username = 'frank'`,
      );
      expect(result.rows).toEqual([{ name: 'Frank Example', display_username: 'frank', given_name: 'Frank', family_name: 'Example', image: null }]);
    });

    test('a sign-up without a name is accepted', async () => {
      const response = await signUpRequest(server.app, { ...signUpInput('grace'), name: undefined });
      expect(response.statusCode).toBe(200);
    });

    test('Better Auth sees the client IP from Fastify, not from a client-sent header', async () => {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        headers: { 'x-tdl-client-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.9' },
        payload: { ...signUpInput('erin') },
      });
      expect(response.statusCode).toBe(200);
      const result = await server.db.execute<{ ip_address: string }>(
        sql`select s.ip_address from session s join "user" u on u.id = s.user_id where u.username = 'erin'`,
      );
      expect(result.rows).toEqual([{ ip_address: '127.0.0.1' }]);
    });

    test('a username in any script, with passwords counted in characters (code points)', async () => {
      // 14 astral characters are 28 UTF-16 code units: accepted.
      const short = await signUpRequest(server.app, { ...signUpInput('アリス', { email: 'arisu@example.com', password: '🔑'.repeat(14) }) });
      expect(short.statusCode).toBe(200);
      expect((await logIn(server.app, 'アリス', '🔑'.repeat(14))).statusCode).toBe(200);
      // 128 astral characters are 256 code units: still accepted, since the limit counts characters.
      const long = await signUpRequest(server.app, { ...signUpInput('🦊', { email: 'fox@example.com', password: '🔑'.repeat(128) }) });
      expect(long.statusCode).toBe(200);
      expect((await logIn(server.app, '🦊', '🔑'.repeat(128))).statusCode).toBe(200);
      expect(await invalid({ ...signUpInput('carol', { password: '🔑'.repeat(129) }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'password', code: 'too-long' }],
      });
      expect(await invalid({ ...signUpInput('carol', { password: '🔑'.repeat(13) }) })).toEqual({
        code: 'invalid',
        errors: [{ field: 'password', code: 'too-short' }],
      });
    });
  });

  describe('login', () => {
    beforeAll(async () => {
      await signUp(server.app, 'dave');
    });

    test('logging in with the username gives a token and an httpOnly session cookie', async () => {
      const response = await logIn(server.app, 'dave');
      expect(response.statusCode).toBe(200);
      const token = bearerOf(response.headers);
      expect(String(response.headers['set-cookie'])).toMatch(/HttpOnly/i);
      const me = await server.app.inject({ url: '/api/me', headers: auth(token) });
      expect(me.json()).toMatchObject({ username: 'dave' });
    });

    test('logging in with the email gives a token', async () => {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'dave@example.com', password: PASSWORD },
      });
      expect(response.statusCode).toBe(200);
      const me = await server.app.inject({ url: '/api/me', headers: auth(bearerOf(response.headers)) });
      expect(me.json()).toMatchObject({ username: 'dave' });
    });

    test('the session cookie alone authenticates', async () => {
      const response = await logIn(server.app, 'dave');
      const cookie = response.cookies.find((c) => c.name.endsWith('session_token'));
      expect(cookie).toBeDefined();
      const me = await server.app.inject({ url: '/api/me', cookies: { [cookie?.name ?? '']: cookie?.value ?? '' } });
      expect(me.statusCode).toBe(200);
    });

    test('a wrong password and an unknown user give 401 invalid-credentials with identical bodies', async () => {
      const wrongPassword = await logIn(server.app, 'dave', 'not the password at all');
      const unknownUser = await logIn(server.app, 'nobody', PASSWORD);
      const wrongEmailPassword = await server.app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'dave@example.com', password: 'not the password at all' },
      });
      for (const response of [wrongPassword, unknownUser, wrongEmailPassword]) {
        expect(response.statusCode).toBe(401);
        expect(response.body).toBe(JSON.stringify({ code: 'invalid-credentials' }));
      }
    });

    test('a login with missing fields gives 422 invalid', async () => {
      const response = await server.app.inject({ method: 'POST', url: '/api/auth/sign-in/username', payload: { username: 'dave' } });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({ code: 'invalid' });
    });

    test('Better Auth routes outside the allowed set are not exposed', async () => {
      const token = bearerOf((await logIn(server.app, 'dave')).headers);
      const response = await server.app.inject({ method: 'POST', url: '/api/auth/update-user', headers: auth(token), payload: { name: 'x' } });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ code: 'not-found' });
    });
  });
});

describe('sign-up when the Inbox cannot be created', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  beforeAll(async () => {
    server = await testApp();
    await server.db.execute(sql`alter table lists add constraint no_lists check (false)`);
  });
  afterAll(async () => {
    await server.close();
  });

  test('fails without leaving an account behind', async () => {
    const response = await signUpRequest(server.app, { ...signUpInput('alice') });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'internal-error' });
    const users = await server.db.execute<{ n: number }>(sql`select count(*)::int as n from "user"`);
    expect(users.rows).toEqual([{ n: 0 }]);
  });
});
