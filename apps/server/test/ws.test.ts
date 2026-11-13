import { request as httpRequest } from 'node:http';
import { newId, type Id } from '@tdl/domain';
import { createClock, type Operation } from '@tdl/sync';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { auth, bearerOf, logIn, signUp } from './auth-helpers.ts';
import { testApp } from './db.ts';

const clock = createClock('device', () => Date.now());
const op = (record: Operation['record'], change: Pick<Operation, 'meta' | 'content'>): Operation => ({ id: newId(), hlc: clock.tick(), record, ...change });

interface LiveSocket {
  /** The next message, parsed; rejects after `ms`. */
  next(ms?: number): Promise<unknown>;
  /** The close code, once closed. */
  closed: Promise<number>;
  close(): void;
}

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

  /** Opens `/api/sync/ws` with the platform WebSocket, sending the token as a bearer header. */
  function open(token: string): LiveSocket {
    const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/api/sync/ws?protocol=1.0`, { headers: auth(token) });
    const queue: unknown[] = [];
    const waiting: ((message: unknown) => void)[] = [];
    socket.addEventListener('message', (event) => {
      const message: unknown = JSON.parse(String(event.data));
      const resolve = waiting.shift();
      if (resolve === undefined) queue.push(message);
      else resolve(message);
    });
    const closed = new Promise<number>((resolve) => {
      socket.addEventListener('close', (event) => {
        resolve(event.code);
      });
    });
    const live: LiveSocket = {
      next: (ms = 1000) =>
        queue.length > 0
          ? Promise.resolve(queue.shift())
          : new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error(`no message within ${String(ms)} ms`));
              }, ms);
              waiting.push((message) => {
                clearTimeout(timer);
                resolve(message);
              });
            }),
      closed,
      close: () => {
        socket.close();
      },
    };
    sockets.push(live);
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

  test('a socket with no token is refused with 401 before upgrading', async () => {
    expect(await refusedUpgrade({})).toEqual({ status: 401, body: { code: 'session-expired' } });
  });

  test('a missing, malformed or other-major protocol version is refused with 426 before the session check', async () => {
    const mismatch = { status: 426, body: { code: 'protocol-mismatch' } };
    expect(await refusedUpgrade({}, '')).toEqual(mismatch);
    expect(await refusedUpgrade(auth(alice), '?protocol=1')).toEqual(mismatch);
    expect(await refusedUpgrade(auth(alice), '?protocol=2.0')).toEqual(mismatch);
  });

  test('a foreign Origin is refused with 403 before upgrading', async () => {
    expect(await refusedUpgrade({ ...auth(alice), origin: 'https://evil.example' })).toEqual({ status: 403, body: { code: 'forbidden' } });
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
});
