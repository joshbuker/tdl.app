import { newId } from '@tdl/domain';
import { MemoryStore, NetworkError, SessionError, type HttpTransportOptions, type PullPage, type Transport } from '@tdl/sync';
import { describe, expect, test, vi } from 'vitest';
import { AppController, type AppState } from '../src/app-controller.ts';
import { MemoryKeyValue, type Platform } from '../src/platform.ts';
import type { Me } from '../src/server-api.ts';
import { BASE_URL, FakeFetch } from './fake-fetch.ts';

type Mode = 'offline' | 'ok' | 'session-expired' | 'session-revoked';

/** A token platform in memory, whose transports answer according to `mode`. */
class TestPlatform implements Platform {
  readonly auth = 'token' as const;
  readonly store = new MemoryStore();
  readonly keyValue = new MemoryKeyValue();
  token: string | null = null;
  mode: Mode = 'offline';
  readonly transports: HttpTransportOptions[] = [];
  /** Push calls made by any transport. */
  pushes = 0;

  openStore() {
    return Promise.resolve({ replicaStore: this.store, keyValue: this.keyValue });
  }

  loadToken() {
    return Promise.resolve(this.token);
  }

  saveToken(token: string | null) {
    this.token = token;
    return Promise.resolve();
  }

  transport(options: HttpTransportOptions): Transport {
    this.transports.push(options);
    const fail = (): Error | null => {
      if (this.mode === 'offline') return new NetworkError();
      if (this.mode === 'ok') return null;
      return new SessionError(this.mode);
    };
    return {
      push: (ops) => {
        this.pushes += 1;
        const error = fail();
        return error === null ? Promise.resolve(ops.map((op, i) => ({ id: op.id, status: 'accepted' as const, seq: i + 1 }))) : Promise.reject(error);
      },
      pull: () => {
        const error = fail();
        const page: PullPage = { entries: [], cursor: 0, more: false };
        return error === null ? Promise.resolve(page) : Promise.reject(error);
      },
      subscribe: () => () => undefined,
      serverVersion: () => null,
    };
  }
}

const meOf = (username: string): Me => ({ userId: newId(), username, defaultListId: newId() });

/** A platform holding a replica for `me`, with `me` cached, and a stored token. */
async function storedPlatform(me: Me): Promise<TestPlatform> {
  const platform = new TestPlatform();
  await platform.store.init(me.userId, newId());
  await platform.keyValue.set('me', { ...me });
  platform.token = 'old-token';
  return platform;
}

const ready = (controller: AppController): Extract<AppState, { kind: 'ready' }> => {
  const state = controller.state();
  if (state.kind !== 'ready') throw new Error(`expected ready, got ${state.kind}`);
  return state;
};

const pendingCount = async (platform: TestPlatform): Promise<number | undefined> => (await platform.store.load())?.pending.length;

describe('AppController', () => {
  test('starts offline from a cached me and a stored replica', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch();
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });

    expect(controller.state()).toEqual({ kind: 'starting' });
    await controller.start();

    const state = ready(controller);
    expect(state.me).toEqual(alice);
    expect(state.sessionEnded).toBe(false);
    expect(state.replica.status()).toBe('offline');
    expect(platform.transports[0]).toMatchObject({ baseUrl: BASE_URL, token: 'old-token' });
  });

  test('without stored data, the server decides between ready and logged out', async () => {
    const alice = meOf('alice');
    const platform = new TestPlatform();
    platform.token = 'tok';
    platform.mode = 'ok';
    const server = new FakeFetch().on('GET /api/me', { status: 200, body: alice });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    expect(ready(controller).me).toEqual(alice);
    expect(await platform.keyValue.get('me')).toEqual(alice);
    expect((await platform.store.load())?.userId).toBe(alice.userId);

    const loggedOut = new TestPlatform();
    loggedOut.token = 'tok';
    const expired = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-expired' } });
    const other = new AppController({ baseUrl: BASE_URL, platform: loggedOut, fetch: expired.fetch });
    await other.start();
    expect(other.state()).toEqual({ kind: 'logged-out' });
  });

  test('a token platform without a token starts logged out', async () => {
    const server = new FakeFetch();
    const controller = new AppController({ baseUrl: BASE_URL, platform: new TestPlatform(), fetch: server.fetch });
    await controller.start();
    expect(controller.state()).toEqual({ kind: 'logged-out' });
    expect(server.calls).toEqual([]);
  });

  test('an expired session at start keeps the data and ends the session', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-expired' } });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();

    expect(ready(controller).sessionEnded).toBe(true);
    expect(await platform.store.load()).not.toBeNull();
  });

  test("a session of another user at start ends the session, so this user's changes aren't pushed under it", async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    platform.mode = 'ok';
    await platform.store.putPending({ id: newId(), hlc: '0', record: { type: 'list', id: newId() }, meta: { kind: 'createList' }, content: null });
    const server = new FakeFetch().on('GET /api/me', { status: 200, body: meOf('bob') });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();

    expect(ready(controller)).toMatchObject({ me: alice, sessionEnded: true });
    expect(await platform.keyValue.get('me')).toEqual(alice);
    expect(platform.pushes).toBe(0);
  });

  test('a revoked session at start wipes the data and logs out', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-revoked' } });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();

    expect(controller.state()).toEqual({ kind: 'logged-out' });
    expect(await platform.store.load()).toBeNull();
    expect(await platform.keyValue.get('me')).toBeNull();
    expect(platform.token).toBeNull();
  });

  test('a replica status of logged-out ends the session; revoked logs out', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch();
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    const states: string[] = [];
    controller.onChange(() => {
      const state = controller.state();
      states.push(state.kind === 'ready' ? `ready${state.sessionEnded ? ' ended' : ''}` : state.kind);
    });
    const { replica } = ready(controller);

    platform.mode = 'session-expired';
    await replica.sync();
    expect(ready(controller).sessionEnded).toBe(true);

    platform.mode = 'session-revoked';
    await replica.sync();
    await vi.waitFor(() => {
      expect(controller.state()).toEqual({ kind: 'logged-out' });
    });
    expect(await platform.keyValue.get('me')).toBeNull();
    expect(platform.token).toBeNull();
    expect(states).toContain('ready ended');
    expect(states.at(-1)).toBe('logged-out');
  });

  test('relays the replica changes', async () => {
    const platform = await storedPlatform(meOf('alice'));
    const server = new FakeFetch();
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    let changes = 0;
    controller.onChange(() => {
      changes += 1;
    });

    await ready(controller).replica.createList('House');
    expect(changes).toBeGreaterThan(0);
  });

  test('logging in as another user replaces the stored replica', async () => {
    const alice = meOf('alice');
    const bob = meOf('bob');
    const platform = await storedPlatform(alice);
    // Logged out of alice without the data going, e.g. the app was closed mid-logout.
    platform.token = null;
    await platform.keyValue.clear();
    await platform.store.putPending({ id: newId(), hlc: '0', record: { type: 'list', id: newId() }, meta: { kind: 'createList' }, content: null });
    const server = new FakeFetch()
      .on('POST /api/auth/sign-in/username', { status: 200, body: {}, headers: { 'set-auth-token': 'bob-token' } })
      .on('GET /api/me', { status: 200, body: bob });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    expect(controller.state()).toEqual({ kind: 'logged-out' });

    await controller.logIn('bob', 'secret');

    expect(ready(controller).me).toEqual(bob);
    expect(platform.token).toBe('bob-token');
    const stored = await platform.store.load();
    expect(stored?.userId).toBe(bob.userId);
    expect(stored?.pending).toEqual([]);
    expect(await platform.keyValue.get('me')).toEqual(bob);
  });

  test('logOut() with pending operations returns unsynced and keeps the data', async () => {
    const platform = await storedPlatform(meOf('alice'));
    const server = new FakeFetch().on('POST /api/auth/sign-out', { status: 200, body: { success: true } });
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    const { replica } = ready(controller);
    await replica.createList('House');
    server.online = true;

    expect(await controller.logOut()).toEqual({ kind: 'unsynced', count: 2, sessionEnded: false });

    expect(ready(controller).replica).toBe(replica);
    expect(await pendingCount(platform)).toBe(2);
    expect(platform.token).toBe('old-token');
    expect(server.callsTo('POST /api/auth/sign-out')).toEqual([]);
  });

  test("logOut('discard') wipes even when sign-out fails with a network error", async () => {
    const platform = await storedPlatform(meOf('alice'));
    const server = new FakeFetch();
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    await ready(controller).replica.createList('House');

    expect(await controller.logOut('discard')).toEqual({ kind: 'done' });

    expect(server.callsTo('POST /api/auth/sign-out')).toHaveLength(1);
    expect(controller.state()).toEqual({ kind: 'logged-out' });
    expect(await platform.store.load()).toBeNull();
    expect(await platform.keyValue.get('me')).toBeNull();
    expect(platform.token).toBeNull();
  });

  test('logOut() without pending operations signs out and wipes', async () => {
    const platform = await storedPlatform(meOf('alice'));
    const server = new FakeFetch().on('POST /api/auth/sign-out', { status: 401, body: { code: 'session-expired' } });
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    server.online = true;

    expect(await controller.logOut()).toEqual({ kind: 'done' });
    expect(server.callsTo('POST /api/auth/sign-out')[0]?.init.headers).toMatchObject({ authorization: 'Bearer old-token' });
    expect(controller.state()).toEqual({ kind: 'logged-out' });
    expect(await platform.store.load()).toBeNull();
  });

  test("logOut('discard') wipes even when sign-out fails with a server error", async () => {
    const platform = await storedPlatform(meOf('alice'));
    const server = new FakeFetch().on('POST /api/auth/sign-out', { status: 500, body: { code: 'internal-error' } });
    server.online = false;
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    await ready(controller).replica.createList('House');
    server.online = true;

    expect(await controller.logOut('discard')).toEqual({ kind: 'done' });

    expect(server.callsTo('POST /api/auth/sign-out')).toHaveLength(1);
    expect(controller.state()).toEqual({ kind: 'logged-out' });
    expect(await platform.store.load()).toBeNull();
    expect(await platform.keyValue.get('me')).toBeNull();
    expect(platform.token).toBeNull();
  });

  test('logInAgain as another user is refused and changes nothing', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-expired' } });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    const before = ready(controller);
    expect(before.sessionEnded).toBe(true);
    await before.replica.createList('House');

    server
      .on('POST /api/auth/sign-in/username', { status: 200, body: {}, headers: { 'set-auth-token': 'bob-token' } })
      .on('GET /api/me', { status: 200, body: meOf('bob') })
      .on('POST /api/auth/sign-out', { status: 200, body: { success: true } });
    const error = await controller.logInAgain('bob', 'secret').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 403, code: 'different-user' });
    expect(controller.state()).toBe(before);
    expect(platform.token).toBe('old-token');
    expect(await pendingCount(platform)).toBe(2);
    expect(await platform.keyValue.get('me')).toEqual(alice);
    // The session just made for the other user is ended, not left behind.
    expect(server.callsTo('POST /api/auth/sign-out')[0]?.init.headers).toMatchObject({ authorization: 'Bearer bob-token' });
  });

  test('logInAgain as the same user reopens the replica and syncs the queued changes', async () => {
    const alice = meOf('alice');
    const platform = await storedPlatform(alice);
    const server = new FakeFetch().on('GET /api/me', { status: 401, body: { code: 'session-expired' } });
    const controller = new AppController({ baseUrl: BASE_URL, platform, fetch: server.fetch });
    await controller.start();
    await ready(controller).replica.createList('House');

    server
      .on('POST /api/auth/sign-in/username', { status: 200, body: {}, headers: { 'set-auth-token': 'new-token' } })
      .on('GET /api/me', { status: 200, body: alice });
    platform.mode = 'ok';
    await controller.logInAgain('alice', 'secret');

    const state = ready(controller);
    expect(state.sessionEnded).toBe(false);
    expect(state.replica.pending()).toEqual([]);
    expect(state.replica.status()).toBe('ok');
    expect(platform.token).toBe('new-token');
    expect(platform.transports.at(-1)).toMatchObject({ token: 'new-token' });
  });
});

