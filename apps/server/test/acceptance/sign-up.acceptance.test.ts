import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { startServer, type TestServer } from './harness.ts';

describe('Sign up', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('Sign up', async () => {
    // Given the server allows public sign-up
    // When a visitor signs up with valid details
    const carol = await server.signUp('carol');

    // Then they have an account and are logged in
    const me = await server.request('GET', '/me', { token: carol.token });
    expect(me).toMatchObject({ status: 200, body: { userId: carol.userId, username: carol.username } });
    const phone = await server.device(carol);
    expect(phone.status()).toBe('ok');
    expect([...phone.state().lists.values()].map((l) => l.title)).toEqual(['Inbox']);
  });
});
