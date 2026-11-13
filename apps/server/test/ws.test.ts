import { request as httpRequest } from 'node:http';
import { newId, type Id } from '@tdl/domain';
import { createClock, type Operation } from '@tdl/sync';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { session } from '../src/db/schema.ts';
import { auth, bearerOf, logIn, signUp } from './auth-helpers.ts';
import { testApp } from './db.ts';

const clock = createClock('device', () => Date.now());
const op = (record: Operation['record'], change: Pick<Operation, 'meta' | 'content'>): Operation => ({ id: newId(), hlc: clock.tick(), record, ...change });

interface LiveSocket {
  /** Resolves once the socket is open. */
  opened: Promise<void>;
  /** The next message, parsed; rejects after `ms`. */
  next(ms?: number): Promise<unknown>;
  /** The close code, once closed. */
  closed: Promise<number>;
  send(message: unknown): void;
  close(): void;
}

const OWN_ORIGIN = 'http://localhost:3000';
const APP_ORIGIN = 'https://localhost';
const EVIL_ORIGIN = 'https://evil.example';
const MINUTE = 60 * 1000;

/** Fakes timers (including the server's, which runs in this process) while letting real time pass for I/O. */
const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'], shouldAdvanceTime: true });

describe('live updates', () => {
  let server: Awaited<ReturnType<typeof testApp>>;
  let base: string;
  let alice: string;
  let bob: string;
  const house = newId();
  const paintFence = newId();
  const sockets: LiveSocket[] = [];

  const push = async (token: string, ops: Operation[]) => {
    const response = await server.app.inject({ method: 'POST', url: '/api/sync/push', headers: auth(token), payload: { ops } });
    expect(response.statusCode).toBe(200);
  };

  /** Logs alice in on a new session and returns its bearer token and session cookie (`name=value`). */
  async function newSession(userAgent: string): Promise<{ token: string; cookie: string }> {
    const response = await logIn(server.app, 'alice', undefined, userAgent);
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    const cookie = cookies.find((c) => c.includes('session_token='))?.split(';')[0];
    if (cookie === undefined) throw new Error('no session cookie');
    return { token: bearerOf(response.headers), cookie };
  }

  /** Opens `/api/sync/ws` with the platform WebSocket and the given handshake headers. */
  function connect(headers: Record<string, string> = {}): LiveSocket {
    const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/api/sync/ws?protocol=1.0`, { headers });
    const queue: unknown[] = [];
    const waiting: ((message: unknown) => void)[] = [];
    socket.addEventListener('message', (event) => {
      const message: unknown = JSON.parse(String(event.data));
      const resolve = waiting.shift();
      if (resolve === undefined) queue.push(message);
      else resolve(message);
    });
    const opened = new Promise<void>((resolve) => {
      socket.addEventListener('open', () => {
        resolve();
      });
    });
    const closed = new Promise<number>((resolve) => {
      socket.addEventListener('close', (event) => {
        resolve(event.code);
      });
    });
    const live: LiveSocket = {
      opened,
      next: (ms = 1000) =>
        queue.length > 0
          ? Promise.resolve(queue.shift())
          : new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                waiting.splice(waiting.indexOf(deliver), 1);
                reject(new Error(`no message within ${String(ms)} ms`));
              }, ms);
              const deliver = (message: unknown) => {
                clearTimeout(timer);
                resolve(message);
              };
              waiting.push(deliver);
            }),
      closed,
      send: (message) => {
        socket.send(JSON.stringify(message));
      },
      close: () => {
        socket.close();
      },
    };
    sockets.push(live);
    return live;
  }

  /** Opens a socket the way token clients do: without credentials, then the token in the first message. */
  function open(token: string, headers: Record<string, string> = {}): LiveSocket {
    const live = connect(headers);
    void live.opened.then(() => {
      live.send({ type: 'auth', token });
    });
    return live;
  }

  /** The status and body of an upgrade request the server refuses. */
  function refusedUpgrade(headers: Record<string, string>, query = '?protocol=1.0'): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
      const req = httpRequest(`${base}/api/sync/ws${query}`, {
        headers: { connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==', ...headers },
      });
      req.on('upgrade', () => {
        reject(new Error('upgraded'));
      });
      req.on('response', (response) => {
        let body = '';
        response.on('data', (chunk: Buffer) => (body += chunk.toString()));
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(body) });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  beforeAll(async () => {
    server = await testApp();
    base = await server.app.listen({ port: 0, host: '127.0.0.1' });
    alice = await signUp(server.app, 'alice');
    bob = await signUp(server.app, 'bob');
    await push(alice, [
      op({ type: 'list', id: house }, { meta: { kind: 'createList' }, content: null }),
      op({ type: 'task', id: paintFence }, { meta: { kind: 'createTask', listId: house }, content: null }),
    ]);
    const invitation = await server.app.inject({
      method: 'POST',
      url: '/api/invitations',
      headers: auth(alice),
      payload: { target: { kind: 'list', id: house }, username: 'bob', role: 'editor' },
    });
    const { id } = invitation.json<{ id: Id }>();
    expect((await server.app.inject({ method: 'POST', url: `/api/invitations/${id}/accept`, headers: auth(bob) })).statusCode).toBe(204);
  });
  afterAll(async () => {
    for (const socket of sockets) socket.close();
    await server.close();
  });

  test("alice's socket hears of bob's edit to a shared task within a second", async () => {
    const socket = open(alice);
    const first = (await socket.next()) as { type: string; id: number };
    expect(first).toEqual({ type: 'feed', id: expect.any(Number) as number });

    await push(bob, [op({ type: 'task', id: paintFence }, { meta: null, content: { field: 'title', value: 'Paint the fence' } })]);
    const notification = (await socket.next(1000)) as { type: string; id: number };
    expect(notification.type).toBe('feed');
    expect(notification.id).toBeGreaterThan(first.id);
  });

  test('a cookie connection from another origin is refused with 403; from our own it gets a feed message', async () => {
    const { cookie } = await newSession('browser');
    expect(await refusedUpgrade({ cookie, origin: EVIL_ORIGIN })).toEqual({ status: 403, body: { code: 'forbidden' } });
    expect(await refusedUpgrade({ cookie, origin: APP_ORIGIN })).toEqual({ status: 403, body: { code: 'forbidden' } });
    expect(await connect({ cookie, origin: OWN_ORIGIN }).next()).toEqual({ type: 'feed', id: expect.any(Number) as number });
  });

  test('a cookie connection with no valid session is refused with 401 before upgrading', async () => {
    expect(await refusedUpgrade({ cookie: 'better-auth.session_token=nope', origin: OWN_ORIGIN })).toEqual({ status: 401, body: { code: 'session-expired' } });
  });

  test('a token client from an app origin gets nothing until it sends the auth message, then a feed message', async () => {
    const socket = connect({ origin: APP_ORIGIN });
    await socket.opened;
    await expect(socket.next(300)).rejects.toThrow(/no message/);
    socket.send({ type: 'auth', token: alice });
    expect(await socket.next()).toEqual({ type: 'feed', id: expect.any(Number) as number });
  });

  test('the Authorization header is not read on the websocket', async () => {
    const socket = connect({ authorization: `Bearer ${alice}` });
    await socket.opened;
    await expect(socket.next(300)).rejects.toThrow(/no message/);
    socket.close();
  });

  test('a bad token, or any other first message, closes the socket with 4403', async () => {
    expect(await open('nope', { origin: APP_ORIGIN }).closed).toBe(4403);
    expect(await open('n\u2603pe').closed).toBe(4403);
    const socket = connect();
    await socket.opened;
    socket.send({ type: 'hello' });
    expect(await socket.closed).toBe(4403);
  });

  test('a socket that sends no auth message within 5 s is closed with 4403', async () => {
    fakeTimers();
    try {
      const socket = connect({ origin: APP_ORIGIN });
      await socket.opened;
      await vi.advanceTimersByTimeAsync(4900);
      await vi.advanceTimersByTimeAsync(100);
      expect(await socket.closed).toBe(4403);
    } finally {
      vi.useRealTimers();
    }
  });

  test('a connection without a cookie from a foreign origin is refused with 403', async () => {
    expect(await refusedUpgrade({ origin: EVIL_ORIGIN })).toEqual({ status: 403, body: { code: 'forbidden' } });
  });

  test('the 11th unauthenticated socket from one address is closed with 4403', async () => {
    const waiting = Array.from({ length: 10 }, () => connect({ origin: APP_ORIGIN }));
    await Promise.all(waiting.map((socket) => socket.opened));
    expect(await connect({ origin: APP_ORIGIN }).closed).toBe(4403);
    // Authenticating frees their places.
    for (const socket of waiting) socket.send({ type: 'auth', token: alice });
    for (const socket of waiting) expect(await socket.next()).toMatchObject({ type: 'feed' });
    for (const socket of waiting) socket.close();
  });

  test('a missing, malformed or other-major protocol version is refused with 426 before the session check', async () => {
    const mismatch = { status: 426, body: { code: 'protocol-mismatch' } };
    expect(await refusedUpgrade({}, '')).toEqual(mismatch);
    expect(await refusedUpgrade({}, '?protocol=1')).toEqual(mismatch);
    expect(await refusedUpgrade({}, '?protocol=2.0')).toEqual(mismatch);
  });

  test('revoking the session closes its open socket with 4401', async () => {
    const phone = bearerOf((await logIn(server.app, 'alice', undefined, 'phone')).headers);
    const socket = open(phone);
    await socket.next();
    const sessions = (await server.app.inject({ url: '/api/sessions', headers: auth(alice) })).json<{ id: Id; userAgent: string }[]>();
    const phoneSession = sessions.find((s) => s.userAgent === 'phone');
    const revoke = await server.app.inject({ method: 'DELETE', url: `/api/sessions/${phoneSession?.id ?? ''}`, headers: auth(alice) });
    expect(revoke.statusCode).toBe(204);
    expect(await socket.closed).toBe(4401);
  });

  test("signing out closes the session's sockets with 4403", async () => {
    const { token, cookie } = await newSession('laptop');
    const byToken = open(token);
    const byCookie = connect({ cookie, origin: OWN_ORIGIN });
    await byToken.next();
    await byCookie.next();
    const other = open(alice);
    await other.next();
    const signOut = await server.app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { authorization: `Bearer ${token}`, origin: OWN_ORIGIN } });
    expect(signOut.statusCode).toBe(200);
    expect(await byToken.closed).toBe(4403);
    expect(await byCookie.closed).toBe(4403);
    await expect(other.next(300)).rejects.toThrow(/no message/);
  });

  test('the 30-minute recheck closes the socket of a session that has expired with 4403', async () => {
    fakeTimers();
    try {
      const { token } = await newSession('expiring');
      const socket = open(token);
      await socket.next();
      await server.db.update(session).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(session.userAgent, 'expiring'));
      await vi.advanceTimersByTimeAsync(29 * MINUTE);
      await expect(socket.next(100)).rejects.toThrow(/no message/);
      await vi.advanceTimersByTimeAsync(MINUTE);
      expect(await socket.closed).toBe(4403);
    } finally {
      vi.useRealTimers();
    }
  });
});
