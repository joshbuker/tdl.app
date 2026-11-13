import { describe, expect, test } from 'vitest';
import { createHttpTransport, type FetchLike } from '../src/http-transport.ts';
import { NetworkError, RefusedError, SessionError, VersionError } from '../src/transport.ts';
import type { Operation } from '../src/operations.ts';

interface Call {
  url: string;
  init: Parameters<FetchLike>[1];
}

/** A fetch that answers every request with `status`, `body` and `headers`, recording the calls. */
function stubFetch(status: number, body: unknown, headers: Record<string, string> = { 'tdl-protocol': '1.0' }): FetchLike & { calls: Call[] } {
  const calls: Call[] = [];
  const fetch = (url: string, init: Parameters<FetchLike>[1]) => {
    calls.push({ url, init });
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: () => Promise.resolve(body),
    });
  };
  return Object.assign(fetch, { calls });
}

const baseUrl = 'https://tdl.example';

describe('createHttpTransport', () => {
  test('a 401 session-revoked body throws SessionError with that code', async () => {
    const transport = createHttpTransport({ baseUrl, fetch: stubFetch(401, { code: 'session-revoked' }) });
    const error: unknown = await transport.pull(0, 500).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SessionError);
    expect((error as SessionError).code).toBe('session-revoked');
  });

  test('any other 401 throws SessionError session-expired', async () => {
    const transport = createHttpTransport({ baseUrl, fetch: stubFetch(401, { code: 'session-expired' }) });
    await expect(transport.push([])).rejects.toMatchObject({ name: 'SessionError', code: 'session-expired' });
  });

  test('a rejected fetch throws NetworkError', async () => {
    const transport = createHttpTransport({ baseUrl, fetch: () => Promise.reject(new TypeError('fetch failed')) });
    await expect(transport.pull(0, 500)).rejects.toBeInstanceOf(NetworkError);
    await expect(transport.push([])).rejects.toBeInstanceOf(NetworkError);
  });

  test('push sends the operations and parses the results', async () => {
    const pushed: Operation = {
      id: '018f0000-0000-7000-8000-000000000001',
      hlc: '000000000000001:000000:a',
      record: { type: 'list', id: '018f0000-0000-7000-8000-000000000002' },
      meta: { kind: 'createList' },
      content: null,
    };
    const fetch = stubFetch(200, { results: [{ id: pushed.id, status: 'accepted', seq: 7 }] });
    const transport = createHttpTransport({ baseUrl, token: 'secret', fetch });
    expect(await transport.push([pushed])).toEqual([{ id: pushed.id, status: 'accepted', seq: 7 }]);
    expect(fetch.calls).toEqual([
      {
        url: `${baseUrl}/api/sync/push`,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'tdl-protocol': '1.0', authorization: 'Bearer secret' },
          body: JSON.stringify({ ops: [pushed] }) },
      },
    ]);
  });

  test('pull asks for the page after the cursor and parses it; without a token it sends cookies', async () => {
    const page = { entries: [{ id: 3, kind: 'forget', record: { type: 'task', id: '018f0000-0000-7000-8000-000000000002' } }], cursor: 3, more: false };
    const fetch = stubFetch(200, page);
    const transport = createHttpTransport({ baseUrl, fetch });
    expect(await transport.pull(2, 500)).toEqual(page);
    expect(fetch.calls).toEqual([{ url: `${baseUrl}/api/sync/pull?after=2&limit=500`, init: { method: 'GET', headers: { 'tdl-protocol': '1.0' }, credentials: 'include' } }]);
  });

  test('every request carries the protocol version, and the server\'s is remembered', async () => {
    const fetch = stubFetch(200, { entries: [], cursor: 0, more: false }, { 'tdl-protocol': '1.2' });
    const transport = createHttpTransport({ baseUrl, fetch });
    expect(transport.serverVersion()).toBeNull();
    await transport.pull(0, 500);
    expect(fetch.calls[0]?.init.headers['tdl-protocol']).toBe('1.0');
    expect(transport.serverVersion()).toBe('1.2');
  });

  test('protocolVersion overrides the version sent', async () => {
    const fetch = stubFetch(200, { results: [] });
    await createHttpTransport({ baseUrl, fetch, protocolVersion: '2.0' }).push([]);
    expect(fetch.calls[0]?.init.headers['tdl-protocol']).toBe('2.0');
  });

  test('a 426 throws VersionError with the server\'s version', async () => {
    const transport = createHttpTransport({ baseUrl, fetch: stubFetch(426, { code: 'protocol-mismatch' }, { 'tdl-protocol': '2.0' }) });
    const error: unknown = await transport.push([]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VersionError);
    expect((error as VersionError).serverVersion).toBe('2.0');
    expect(transport.serverVersion()).toBe('2.0');
  });

  test('another client error throws RefusedError with its status and code', async () => {
    const transport = createHttpTransport({ baseUrl, fetch: stubFetch(400, { code: 'bad-request' }) });
    const error: unknown = await transport.pull(0, 500).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RefusedError);
    expect(error).toMatchObject({ status: 400, code: 'bad-request' });
  });

  test('a malformed body throws', async () => {
    await expect(createHttpTransport({ baseUrl, fetch: stubFetch(200, { results: [{ status: 'maybe' }] }) }).push([])).rejects.toThrow();
    await expect(createHttpTransport({ baseUrl, fetch: stubFetch(200, { entries: 'none' }) }).pull(0, 500)).rejects.toThrow();
  });
});

/** A WebSocket stand-in: tests drive its events. */
class FakeSocket {
  static opened: FakeSocket[] = [];
  readonly listeners = new Map<string, ((event: never) => void)[]>();
  closedByClient = false;
  readonly url: string;
  readonly init: { headers: Record<string, string> } | undefined;

  constructor(url: string, init?: { headers: Record<string, string> }) {
    this.url = url;
    this.init = init;
    FakeSocket.opened.push(this);
  }

  addEventListener(type: string, listener: (event: never) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closedByClient = true;
  }

  emit(type: 'open' | 'message' | 'close', event: object = {}): void {
    for (const listener of this.listeners.get(type) ?? []) (listener as (event: object) => void)(event);
  }
}

/** A scheduler that runs nothing until the test says so. */
function manualTimers() {
  const pending: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  return {
    pending,
    delays: () => pending.filter((t) => !t.cancelled).map((t) => t.ms),
    schedule: (fn: () => void, ms: number) => {
      const timer = { fn, ms, cancelled: false };
      pending.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    /** Runs every due timer, once. */
    fire() {
      for (const timer of pending.splice(0)) if (!timer.cancelled) timer.fn();
    },
  };
}

describe('createHttpTransport subscribe', () => {
  const live = (options: { token?: string } = {}) => {
    FakeSocket.opened = [];
    const timers = manualTimers();
    const fetch = stubFetch(200, { entries: [], cursor: 0, more: false });
    const transport = createHttpTransport({ baseUrl, ...options, fetch, WebSocket: FakeSocket, schedule: timers.schedule });
    const heard: number[] = [];
    const unsubscribe = transport.subscribe((id) => heard.push(id));
    const socket = () => FakeSocket.opened.at(-1) as FakeSocket;
    return { transport, timers, fetch, heard, unsubscribe, socket };
  };

  test('opens /api/sync/ws with the protocol version and bearer token and passes each feed ID on', () => {
    const { heard, socket } = live({ token: 'secret' });
    expect(socket().url).toBe('wss://tdl.example/api/sync/ws?protocol=1.0');
    expect(socket().init).toEqual({ headers: { authorization: 'Bearer secret' } });
    socket().emit('message', { data: JSON.stringify({ type: 'feed', id: 4 }) });
    socket().emit('message', { data: 'not json' });
    socket().emit('message', { data: JSON.stringify({ type: 'other' }) });
    socket().emit('message', { data: JSON.stringify({ type: 'feed', id: 9 }) });
    expect(heard).toEqual([4, 9]);
  });

  test('without a token it relies on cookies', () => {
    const { socket } = live();
    expect(socket().init).toBeUndefined();
  });

  test('reconnects after a drop, backing off from 1 s to at most 30 s, and resets once connected', () => {
    const { timers, socket } = live();
    const delays: number[] = [];
    for (let attempt = 0; attempt < 7; attempt++) {
      socket().emit('close', { code: 1006 });
      delays.push(...timers.delays());
      timers.fire();
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
    expect(FakeSocket.opened).toHaveLength(8);

    socket().emit('open');
    socket().emit('close', { code: 1006 });
    expect(timers.delays()).toEqual([1000]);
  });

  test('a 4401 close stops reconnecting, wakes the subscriber, and the next pull throws session-revoked', async () => {
    const { transport, timers, fetch, heard, socket } = live();
    socket().emit('message', { data: JSON.stringify({ type: 'feed', id: 4 }) });
    socket().emit('close', { code: 4401 });
    expect(timers.delays()).toEqual([]);
    expect(heard).toEqual([4, 4]);
    await expect(transport.pull(4, 500)).rejects.toMatchObject({ name: 'SessionError', code: 'session-revoked' });
    expect(fetch.calls).toEqual([]);
  });

  test('unsubscribing closes the socket and cancels any reconnect', () => {
    const { timers, unsubscribe, socket } = live();
    const first = socket();
    unsubscribe();
    expect(first.closedByClient).toBe(true);
    first.emit('close', { code: 1000 });
    expect(timers.delays()).toEqual([]);

    const { timers: timers2, unsubscribe: unsubscribe2, socket: socket2 } = live();
    socket2().emit('close', { code: 1006 });
    unsubscribe2();
    expect(timers2.delays()).toEqual([]);
    expect(FakeSocket.opened).toHaveLength(1);
  });
});
