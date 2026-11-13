import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PASSWORD, settle, startServer, titles, type TestServer } from './harness.ts';

describe('Login', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Log in', async () => {
    // Given a user "alice" with a known password
    const alice = await server.signUp('alice');
    const laptop = await server.device(alice);
    await laptop.createTask(alice.defaultListId, 'Buy milk');
    await settle(laptop);

    // When she logs in with those credentials
    const token = await server.logIn(alice);

    // Then she sees her tasks
    const phone = await server.device(alice, { token });
    expect(titles(phone)).toEqual(['Buy milk']);
  });

  test('Log in with email', async () => {
    // Given "alice" has the email alice@example.com
    const alice = await server.signUp('alice');
    const laptop = await server.device(alice);
    await laptop.createTask(alice.defaultListId, 'Buy milk');
    await settle(laptop);

    // When she logs in with alice@example.com and her password
    const token = await server.logIn(alice, { identifier: 'email' });

    // Then she sees her tasks
    const phone = await server.device(alice, { token });
    expect(titles(phone)).toEqual(['Buy milk']);
  });

  test('Wrong password', async () => {
    const alice = await server.signUp('alice');

    // When a user logs in with the wrong password
    const wrongPassword = await server.request('POST', '/api/auth/sign-in/username', {
      body: { username: alice.username, password: `${PASSWORD}!` },
    });

    // Then login fails with a generic message
    expect(wrongPassword).toMatchObject({ status: 401, body: { code: 'invalid-credentials' } });
    const unknownUser = await server.request('POST', '/api/auth/sign-in/username', {
      body: { username: 'nobody-by-this-name', password: PASSWORD },
    });
    expect({ status: unknownUser.status, body: unknownUser.body }).toEqual({ status: wrongPassword.status, body: wrongPassword.body });
  });

  test('Revoke a lost device', async () => {
    // Given "alice" is logged in on her phone and laptop
    const alice = await server.signUp('alice');
    const phone = await server.device(alice, { token: await server.logIn(alice, { userAgent: 'phone' }) });
    const laptopToken = await server.logIn(alice, { userAgent: 'laptop' });
    const laptop = await server.device(alice, { token: laptopToken });
    await phone.createTask(alice.defaultListId, 'Buy milk');
    expect(phone.pending()).not.toEqual([]);

    // When she revokes her phone from her laptop's settings
    const sessions = (await server.request('GET', '/api/sessions', { token: laptopToken })).body as { id: string; userAgent: string }[];
    const phoneSession = sessions.find((s) => s.userAgent === 'phone');
    expect((await server.request('DELETE', `/api/sessions/${phoneSession?.id ?? ''}`, { token: laptopToken })).status).toBe(204);

    // Then her phone is logged out and stops syncing
    // And the next time the phone reaches the server, it deletes its local data, including changes that hadn't synced
    await phone.sync();
    expect(phone.status()).toBe('revoked');
    expect(phone.pending()).toEqual([]);
    expect(titles(phone)).toEqual([]);
    expect(phone.state().lists.size).toBe(0);
    await phone.sync();
    expect(phone.status()).toBe('revoked');

    await laptop.createTask(alice.defaultListId, 'Paint fence');
    await settle(laptop);
    expect(laptop.status()).toBe('ok');
    expect(titles(await server.device(alice))).toEqual(['Paint fence']);
  });

  test('Log out', async () => {
    // Given a logged-in user
    const alice = await server.signUp('alice');
    const laptop = await server.device(alice);

    // When they log out
    expect((await server.request('POST', '/api/auth/sign-out', { token: alice.token })).status).toBe(200);

    // Then they are on the login page and the old session no longer works
    expect(await server.request('GET', '/api/me', { token: alice.token })).toMatchObject({ status: 401, body: { code: 'session-expired' } });
    await laptop.sync();
    expect(laptop.status()).toBe('logged-out');
  });
});
