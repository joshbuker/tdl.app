import type { z } from 'zod';
import { errorBodySchema, feedNotificationSchema, parseFeedEntry, pullPageSchema, pushResponseSchema, type Operation, type PullPage } from './operations.ts';
import { NetworkError, RefusedError, SessionError, VersionError, type Transport } from './transport.ts';
import { PROTOCOL_HEADER, PROTOCOL_VERSION } from './version.ts';

// This package uses no platform globals in its types (it runs in browsers, Capacitor and
// Electron), so fetch, WebSocket and timers are described by the little of them it uses.
// The platform `fetch`, `WebSocket` and `setTimeout` all fit.

interface RequestInit {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  credentials?: 'include';
}

export type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<{ status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }>;

export interface SocketLike {
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  addEventListener(type: 'close', listener: (event: { code: number }) => void): void;
  close(): void;
}

/** `init.headers` is sent by Node's and Electron's WebSocket; browsers send cookies instead. */
export type WebSocketLike = new (url: string, init?: { headers: Record<string, string> }) => SocketLike;

/** Runs `fn` after `ms` milliseconds; returns a function that cancels it. */
export type Schedule = (fn: () => void, ms: number) => () => void;

export interface HttpTransportOptions {
  /** The server's URL, e.g. https://tdl.app, without a trailing slash. */
  baseUrl: string;
  /** A bearer token (native apps). Without one, the session cookie is sent. */
  token?: string;
  fetch?: FetchLike;
  WebSocket?: WebSocketLike;
  /** Defaults to the platform's setTimeout. */
  schedule?: Schedule;
  /** The protocol version this app speaks. Defaults to PROTOCOL_VERSION; tests set others. */
  protocolVersion?: string;
}

const MIN_BACKOFF = 1000;
const MAX_BACKOFF = 30_000;
/** The close code the server sends when this device's session is revoked. */
const SESSION_REVOKED_CLOSE = 4401;

interface Platform {
  fetch: FetchLike;
  WebSocket: WebSocketLike;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
const platform = globalThis as unknown as Platform;

const platformSchedule: Schedule = (fn, ms) => {
  const handle = platform.setTimeout(fn, ms);
  return () => {
    platform.clearTimeout(handle);
  };
};

/** The sync transport over the server's HTTP API (`/api/sync/push`, `/api/sync/pull`) and its websocket (`/api/sync/ws`). */
export function createHttpTransport(options: HttpTransportOptions): Transport {
  const requests = createRequester(options);
  let revoked = false;

  return {
    async push(ops: Operation[]) {
      return (await requests.send('POST', '/api/sync/push', pushResponseSchema, { ops })).results;
    },
    async pull(after, limit) {
      if (revoked) throw new SessionError('session-revoked');
      const page = await requests.send('GET', `/api/sync/pull?after=${String(after)}&limit=${String(limit)}`, pullPageSchema);
      const entries: PullPage['entries'] = [];
      for (const raw of page.entries) {
        const entry = parseFeedEntry(raw);
        if (entry === null) throw new Error('invalid-feed-entry');
        entries.push(entry);
      }
      return { ...page, entries };
    },
    subscribe(onFeed) {
      return subscribeToFeed(options, onFeed, () => {
        revoked = true;
      });
    },
    serverVersion: () => requests.serverVersion(),
  };
}

/** Sends JSON requests with the session's credentials, and parses replies with a schema. */
function createRequester({ baseUrl, token, fetch = platform.fetch, protocolVersion = PROTOCOL_VERSION }: HttpTransportOptions) {
  const authorization: Partial<RequestInit> = token === undefined ? { credentials: 'include' } : {};
  const baseHeaders: Record<string, string> = {
    [PROTOCOL_HEADER]: protocolVersion,
    ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
  };
  let serverVersion: string | null = null;

  return {
    serverVersion: () => serverVersion,
    async send<S extends z.ZodType>(method: RequestInit['method'], path: string, schema: S, body?: unknown): Promise<z.infer<S>> {
      const init: RequestInit =
        body === undefined
          ? { method, headers: baseHeaders, ...authorization }
          : { method, headers: { 'content-type': 'application/json', ...baseHeaders }, body: JSON.stringify(body), ...authorization };
      let response: Awaited<ReturnType<FetchLike>>;
      try {
        response = await fetch(`${baseUrl}${path}`, init);
      } catch (error) {
        throw new NetworkError(error);
      }
      serverVersion = response.headers.get(PROTOCOL_HEADER) ?? serverVersion;
      if (response.status === 401) throw sessionError(await response.json());
      if (response.status === 426) throw new VersionError(response.headers.get(PROTOCOL_HEADER), protocolVersion);
      // Rate limits and server or proxy failures are passing: try again later, like being offline.
      if (response.status === 429 || response.status >= 500) throw new NetworkError(response.status);
      if (response.status < 200 || response.status >= 300) throw new RefusedError(response.status, await errorCode(response));
      return schema.parse(await response.json());
    },
  };
}

/** The error contract's `code` from a reply, or `unknown` if its body has none. */
async function errorCode(response: { json(): Promise<unknown> }): Promise<string> {
  try {
    const parsed = errorBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data.code : 'unknown';
  } catch {
    return 'unknown';
  }
}

function sessionError(body: unknown): SessionError {
  const parsed = errorBodySchema.safeParse(body);
  return new SessionError(parsed.success && parsed.data.code === 'session-revoked' ? 'session-revoked' : 'session-expired');
}

/**
 * Keeps a websocket to `/api/sync/ws` open, passing each feed ID to `onFeed`. Reconnects after a drop,
 * backing off from 1 s, doubling up to 30 s. A 4401 close means the session was revoked: it stops,
 * calls `onRevoked`, and wakes `onFeed` so the device syncs and learns it.
 */
function subscribeToFeed(options: HttpTransportOptions, onFeed: (id: number) => void, onRevoked: () => void): () => void {
  const { baseUrl, token, WebSocket = platform.WebSocket, schedule = platformSchedule, protocolVersion = PROTOCOL_VERSION } = options;
  const url = `${baseUrl.replace(/^http/, 'ws')}/api/sync/ws?protocol=${encodeURIComponent(protocolVersion)}`;
  let socket: SocketLike | null = null;
  let cancelRetry: (() => void) | null = null;
  let backoff = MIN_BACKOFF;
  let lastId = 0;
  let stopped = false;

  const connect = (): void => {
    cancelRetry = null;
    const current = token === undefined ? new WebSocket(url) : new WebSocket(url, { headers: { authorization: `Bearer ${token}` } });
    socket = current;
    current.addEventListener('open', () => {
      backoff = MIN_BACKOFF;
    });
    current.addEventListener('message', (event: { data: unknown }) => {
      const id = feedId(event.data);
      if (id === null) return;
      lastId = id;
      onFeed(id);
    });
    current.addEventListener('close', (event: { code: number }) => {
      if (stopped || socket !== current) return;
      if (event.code === SESSION_REVOKED_CLOSE) {
        stopped = true;
        onRevoked();
        onFeed(lastId);
        return;
      }
      cancelRetry = schedule(connect, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF);
    });
  };

  connect();
  return () => {
    stopped = true;
    cancelRetry?.();
    socket?.close();
  };
}

/** The ID in a `{ type: 'feed', id }` message; null for anything else. */
function feedId(data: unknown): number | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = feedNotificationSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data.id : null;
  } catch {
    return null;
  }
}
