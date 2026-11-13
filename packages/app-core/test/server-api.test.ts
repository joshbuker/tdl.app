import { newId } from '@tdl/domain';
import { NetworkError, PROTOCOL_HEADER, PROTOCOL_VERSION } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { ApiError, ServerApi } from '../src/server-api.ts';
import { BASE_URL, FakeFetch } from './fake-fetch.ts';

const me = { userId: newId(), username: 'alice', defaultListId: newId() };

describe('ServerApi', () => {
  test('maps a 422 body to an ApiError with its field errors', async () => {
    const server = new FakeFetch().on('POST /api/auth/sign-up/email', {
      status: 422,
      body: { code: 'invalid', errors: [{ field: 'username', code: 'taken' }] },
    });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    const error = await api
      .signUp({ username: 'alice', email: 'alice@example.com', password: 'p', givenName: 'Alice', familyName: 'Example', acceptTerms: true })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'invalid', errors: [{ field: 'username', code: 'taken' }] });
  });

  test('sends only the allowed sign-up keys, and returns the token header', async () => {
    const server = new FakeFetch().on('POST /api/auth/sign-up/email', { status: 200, body: {}, headers: { 'set-auth-token': 'tok' } });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });
    const input = { username: 'alice', email: 'alice@example.com', password: 'p', givenName: 'Alice', familyName: 'Example', acceptTerms: true };

    expect(await api.signUp({ ...input, extra: 'dropped' } as typeof input)).toEqual({ token: 'tok' });
    expect(JSON.parse(server.calls[0]?.init.body ?? '')).toEqual(input);
  });

  test('sends a bearer header with a token', async () => {
    const server = new FakeFetch().on('GET /api/me', { status: 200, body: me });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch, token: 'tok' });

    expect(await api.me()).toEqual(me);
    const init = server.calls[0]?.init;
    expect(init?.headers).toMatchObject({ authorization: 'Bearer tok', [PROTOCOL_HEADER]: PROTOCOL_VERSION });
    expect(init?.credentials).toBeUndefined();
  });

  test("sends the session cookie without a token", async () => {
    const server = new FakeFetch().on('GET /api/me', { status: 200, body: me });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    await api.me();
    const init = server.calls[0]?.init;
    expect(init?.credentials).toBe('include');
    expect(init?.headers).not.toHaveProperty('authorization');
    expect(init?.headers).toMatchObject({ [PROTOCOL_HEADER]: PROTOCOL_VERSION });
  });

  test('logs in by username or email, and reads the set-auth-token header', async () => {
    const server = new FakeFetch()
      .on('POST /api/auth/sign-in/username', { status: 200, body: {}, headers: { 'set-auth-token': 'by-name' } })
      .on('POST /api/auth/sign-in/email', { status: 200, body: {} });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    expect(await api.logIn('alice', 'secret')).toEqual({ token: 'by-name' });
    expect(await api.logIn('alice@example.com', 'secret')).toEqual({ token: null });
    expect(JSON.parse(server.callsTo('POST /api/auth/sign-in/username')[0]?.init.body ?? '')).toEqual({ username: 'alice', password: 'secret' });
    expect(JSON.parse(server.callsTo('POST /api/auth/sign-in/email')[0]?.init.body ?? '')).toEqual({ email: 'alice@example.com', password: 'secret' });
  });

  test('a 401 is an ApiError with the session code, and an unreachable server a NetworkError', async () => {
    const server = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-revoked' } });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    await expect(api.me()).rejects.toMatchObject({ status: 401, code: 'session-revoked' });
    server.online = false;
    await expect(api.me()).rejects.toBeInstanceOf(NetworkError);
  });

  test('an error without a contract body has the code unknown', async () => {
    const server = new FakeFetch().on('DELETE /api/sessions/x', { status: 500 });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    await expect(api.revokeSession('x')).rejects.toMatchObject({ status: 500, code: 'unknown' });
  });

  test('sharing and session requests', async () => {
    const target = { kind: 'list' as const, id: newId() };
    const invitation = { id: newId(), inviter: { username: 'bob' }, target, role: 'editor' as const };
    const session = { id: newId(), userAgent: null, createdAt: '2026-11-13T00:00:00.000Z', lastSyncedAt: null, current: true };
    const server = new FakeFetch()
      .on('GET /api/invitations', { status: 200, body: [invitation] })
      .on('POST /api/invitations', { status: 201, body: { id: invitation.id } })
      .on(`POST /api/invitations/${invitation.id}/accept`, { status: 204 })
      .on(`POST /api/invitations/${invitation.id}/decline`, { status: 204 })
      .on('DELETE /api/grants/g', { status: 204 })
      .on('GET /api/sessions', { status: 200, body: [session] })
      .on(`DELETE /api/sessions/${session.id}`, { status: 204 })
      .on('POST /api/auth/sign-out', { status: 200, body: { success: true } });
    const api = new ServerApi({ baseUrl: BASE_URL, fetch: server.fetch });

    expect(await api.invitations()).toEqual([invitation]);
    expect(await api.invite(target, 'bob', 'editor')).toEqual({ id: invitation.id });
    expect(JSON.parse(server.callsTo('POST /api/invitations')[0]?.init.body ?? '')).toEqual({ target, username: 'bob', role: 'editor' });
    await api.acceptInvitation(invitation.id);
    await api.declineInvitation(invitation.id);
    await api.removeGrant('g');
    expect(await api.sessions()).toEqual([session]);
    await api.revokeSession(session.id);
    await api.logOut();
    expect(server.calls).toHaveLength(8);
  });
});
