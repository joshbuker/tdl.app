import { AppController, MemoryKeyValue, type AppState, type Platform } from '@tdl/app-core';
import { createHttpTransport, MemoryStore } from '@tdl/sync';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { session } from '../../src/db/schema.ts';
import { PASSWORD, settle, startServer, taskTitled, titles, type TestServer } from './harness.ts';

/** A native app's platform (bearer tokens) over a store in memory. */
function tokenPlatform(store: MemoryStore): Platform & { token: string | null } {
  const keyValue = new MemoryKeyValue();
  return {
    auth: 'token',
    token: null,
    openStore: () => Promise.resolve({ replicaStore: store, keyValue }),
    loadToken() {
      return Promise.resolve(this.token);
    },
    saveToken(token) {
      this.token = token;
      return Promise.resolve();
    },
    transport: (options) => createHttpTransport(options),
  };
}

const ready = (controller: AppController): Extract<AppState, { kind: 'ready' }> => {
  const state = controller.state();
  if (state.kind !== 'ready') throw new Error(`expected ready, got ${state.kind}`);
  return state;
};

describe('Login', () => {
  let server: TestServer;
  const controllers: AppController[] = [];
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    for (const controller of controllers) controller.close();
    await server.close();
  });

  /**
   * "alice"'s app, logged in, whose session has since expired, with "Paint fence" renamed to
   * "Paint the fence" and not synced. Also returns her laptop, which still has a session.
   */
  async function unsyncedAfterExpiry() {
    const alice = await server.signUp('alice');
    const laptop = await server.device(alice);
    await laptop.createTask(alice.defaultListId, 'Paint fence');
    await settle(laptop);

    const store = new MemoryStore();
    const platform = tokenPlatform(store);
    const app = new AppController({ baseUrl: server.url, platform });
    controllers.push(app);
    await app.start();
    await app.logIn(alice.username, PASSWORD);
    const { replica } = ready(app);
    expect(titles(replica)).toEqual(['Paint fence']);

    await expireSession(platform.token);
    expect((await replica.setTaskField(taskTitled(replica, 'Paint fence').id, 'title', 'Paint the fence')).ok).toBe(true);
    await replica.sync();
    expect(ready(app).sessionEnded).toBe(true);
    return { alice, laptop, app, store };
  }

  async function expireSession(token: string | null): Promise<void> {
    if (token === null) throw new Error('no token');
    const expired = await server.db.update(session).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(session.token, token.split('.')[0] ?? '')).returning();
    expect(expired).toHaveLength(1);
  }

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

  test('Log out with unsynced changes', async () => {
    // Given "alice"'s session has expired, and she edited "Paint fence" since it last synced
    const { app } = await unsyncedAfterExpiry();

    // When she logs out
    const result = await app.logOut();

    // Then she is warned that the change to "Paint fence" hasn't synced, and offered to log in again or discard it
    expect(result).toEqual({ kind: 'unsynced', count: 1, sessionEnded: true });
    expect(ready(app).replica.pending()).toHaveLength(1);
  });

  test('Discard unsynced changes', async () => {
    // Given "alice" is warned about unsynced changes while logging out
    const { app, store } = await unsyncedAfterExpiry();
    expect((await app.logOut()).kind).toBe('unsynced');

    // When she chooses to discard them
    expect(await app.logOut('discard')).toEqual({ kind: 'done' });

    // Then she is logged out, and her device's data is deleted
    expect(app.state()).toEqual({ kind: 'logged-out' });
    expect(await store.load()).toBeNull();
  });

  test('Log in again to keep unsynced changes', async () => {
    // Given "alice" is warned about unsynced changes while logging out, after her session expired
    const { alice, laptop, app } = await unsyncedAfterExpiry();
    expect(await app.logOut()).toMatchObject({ kind: 'unsynced', sessionEnded: true });

    // When she chooses to log in again, and does
    await app.logInAgain(alice.username, PASSWORD);

    // Then her changes sync, and she is still logged in
    const state = ready(app);
    await settle(state.replica, laptop);
    expect(state.replica.pending()).toEqual([]);
    expect(titles(laptop)).toEqual(['Paint the fence']);
    expect(ready(app)).toMatchObject({ kind: 'ready', sessionEnded: false, me: { userId: alice.userId } });
  });
});
