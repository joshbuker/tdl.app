// Drives the slice headlessly, the way a device does: through the HTTP API, a Replica, and the domain.
import { buildGraph, newId, nextUpTaskIds, type Id, type Role, type Task } from '@tdl/domain';
import {
  createClock,
  createHttpTransport,
  MemoryStore,
  PROTOCOL_HEADER,
  PROTOCOL_VERSION,
  Replica,
  type FetchLike,
  type Operation,
  type PushResult,
  type RecordRef,
  type ReplicaStore,
  type Transport,
} from '@tdl/sync';
import { expect } from 'vitest';
import { buildApp } from '../../src/app.ts';
import type { Db } from '../../src/db/client.ts';
import { testConfig, testDb } from '../db.ts';

export const PASSWORD = 'correct horse battery';

export interface User {
  userId: Id;
  username: string;
  email: string;
  token: string;
  defaultListId: Id;
}

export interface Reply {
  status: number;
  body: unknown;
}

export interface RequestOptions {
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface Target {
  kind: 'list' | 'task';
  id: Id;
}

/** Whether a device can reach the server. Devices are online unless a test takes them offline. */
export class Network {
  online = true;

  readonly fetch: FetchLike = (url, init) => (this.online ? fetch(url, init) : Promise.reject(new TypeError('fetch failed')));
}

export interface DeviceOptions {
  /** Another session's token, e.g. from `logIn`. Defaults to the session made at sign-up. */
  token?: string;
  network?: Network;
  now?: () => number;
  /** Wraps the device's HTTP transport, e.g. to inject faults. */
  wrap?: (transport: Transport) => Transport;
  /** The protocol version the device's app speaks. Defaults to PROTOCOL_VERSION. */
  protocolVersion?: string;
  /** An existing device's store and ID, to reopen it (e.g. after updating the app). Default to a new device. */
  store?: ReplicaStore;
  deviceId?: string;
}

/** JSON requests to one server, sending its protocol version. */
class Api {
  private readonly url: string;
  private readonly protocolVersion: string;

  constructor(url: string, protocolVersion: string) {
    this.url = url;
    this.protocolVersion = protocolVersion;
  }

  async request(method: string, path: string, { token, body, headers = {} }: RequestOptions = {}): Promise<Reply & { headers: Headers }> {
    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: {
        [PROTOCOL_HEADER]: this.protocolVersion,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: text === '' ? null : (JSON.parse(text) as unknown), headers: response.headers };
  }
}

/** A running server on its own database, and the requests a test makes of it. */
export class TestServer {
  readonly url: string;
  readonly close: () => Promise<void>;
  /** The server's database, for checks the API doesn't offer. */
  readonly db: Db;
  private readonly api: Api;
  private readonly names = new Map<string, number>();
  private readonly clock = createClock('acceptance', () => Date.now());

  constructor(url: string, close: () => Promise<void>, db: Db, protocolVersion: string) {
    this.url = url;
    this.close = close;
    this.db = db;
    this.api = new Api(url, protocolVersion);
  }

  request(method: string, path: string, options?: RequestOptions): Promise<Reply & { headers: Headers }> {
    return this.api.request(method, path, options);
  }

  /** Signs up a new account. Each file shares a server, so a repeated name gets a number. */
  async signUp(name: string): Promise<User> {
    const username = this.uniqueName(name);
    const email = `${username.toLowerCase()}@example.com`;
    const body = { username, email, password: PASSWORD, givenName: name, familyName: 'Example', acceptTerms: true };
    const reply = await this.request('POST', '/api/auth/sign-up/email', { body });
    expect(reply.status, JSON.stringify(reply.body)).toBe(200);
    const token = tokenOf(reply.headers);
    const me = (await this.request('GET', '/api/me', { token })).body as { userId: Id; defaultListId: Id };
    return { userId: me.userId, username, email, token, defaultListId: me.defaultListId };
  }

  /** Logs in by username (or `identifier: 'email'`), returning the new session's token. */
  async logIn(user: User, { identifier = 'username', userAgent = 'acceptance' }: { identifier?: 'username' | 'email'; userAgent?: string } = {}): Promise<string> {
    const body = identifier === 'email' ? { email: user.email, password: PASSWORD } : { username: user.username, password: PASSWORD };
    const reply = await this.request('POST', `/api/auth/sign-in/${identifier}`, { body, headers: { 'user-agent': userAgent } });
    expect(reply.status, JSON.stringify(reply.body)).toBe(200);
    return tokenOf(reply.headers);
  }

  /** A new device for the user, with an empty store (unless given one), synced once if it is online. */
  async device(
    user: User,
    { token = user.token, network = new Network(), now, wrap = (t) => t, protocolVersion, store = new MemoryStore(), deviceId = newId() }: DeviceOptions = {},
  ): Promise<Replica> {
    const replica = await Replica.open({
      store,
      transport: wrap(
        createHttpTransport({ baseUrl: this.url, token, fetch: network.fetch, ...(protocolVersion === undefined ? {} : { protocolVersion }) }),
      ),
      userId: user.userId,
      deviceId,
      ...(now === undefined ? {} : { now }),
    });
    await replica.sync();
    return replica;
  }

  /** The owner invites the invitee to the target, and the invitee accepts. */
  async share(owner: User, target: Target, invitee: User, role: Exclude<Role, 'owner'>): Promise<void> {
    const invitation = await this.request('POST', '/api/invitations', { token: owner.token, body: { target, username: invitee.username, role } });
    expect(invitation.status, JSON.stringify(invitation.body)).toBe(201);
    const { id } = invitation.body as { id: Id };
    expect((await this.request('POST', `/api/invitations/${id}/accept`, { token: invitee.token })).status).toBe(204);
  }

  /** Pushes one content change to a task straight to the server, bypassing the Replica's own checks. */
  pushEdit(user: User, taskId: Id, field: string, value: string | null): Promise<PushResult> {
    return this.push(user, { type: 'task', id: taskId }, { meta: null, content: { field, value } });
  }

  /** Pushes one operation straight to the server, bypassing the Replica's own checks. */
  async push(user: User, record: RecordRef, change: Pick<Operation, 'meta' | 'content'>): Promise<PushResult> {
    const op: Operation = { id: newId(), hlc: this.clock.tick(), record, ...change };
    const reply = await this.request('POST', '/api/sync/push', { token: user.token, body: { ops: [op] } });
    expect(reply.status).toBe(200);
    const [result] = (reply.body as { results: PushResult[] }).results;
    if (result === undefined) throw new Error('no push result');
    return result;
  }

  private uniqueName(name: string): string {
    const count = (this.names.get(name) ?? 0) + 1;
    this.names.set(name, count);
    return count === 1 ? name : `${name}${String(count)}`;
  }
}

function tokenOf(headers: Headers): string {
  const token = headers.get('set-auth-token');
  if (token === null || token === '') throw new Error('no set-auth-token header');
  return token;
}

/** Starts the server on a fresh database, listening on a free port. `protocolVersion` defaults to PROTOCOL_VERSION. */
export async function startServer({ protocolVersion = PROTOCOL_VERSION }: { protocolVersion?: string } = {}): Promise<TestServer> {
  const database = await testDb();
  const config = testConfig(database.url);
  const app = await buildApp(config, { db: database.db, protocolVersion });
  const url = await app.listen({ port: 0, host: '127.0.0.1' });
  return new TestServer(url, async () => {
    await app.close();
    await database.close();
  }, database.db, protocolVersion);
}

const MAX_ROUNDS = 10;

const fingerprint = (replica: Replica): string => {
  const { lists, tasks, links, grants } = replica.state();
  return JSON.stringify([[...lists], [...tasks], [...links], [...grants], replica.pending().length, replica.rejected().length]);
};

/**
 * Syncs every replica, round after round, until a whole round leaves each one unchanged with
 * nothing pending: then nothing was pushed, so every pull has brought everything there is.
 */
export async function settle(...replicas: Replica[]): Promise<void> {
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const before = replicas.map(fingerprint);
    for (const replica of replicas) await replica.sync();
    const unchanged = replicas.every((replica, i) => fingerprint(replica) === before[i] && replica.pending().length === 0);
    if (unchanged) return;
  }
  throw new Error(`replicas did not settle in ${String(MAX_ROUNDS)} rounds`);
}

/** The titles of the replica's next-up tasks, sorted. */
export function nextUp(replica: Replica): string[] {
  const { tasks, links } = replica.state();
  const ids = nextUpTaskIds(buildGraph(tasks.values(), links.values()));
  return [...ids].map((id) => tasks.get(id)?.title ?? id).sort();
}

/** The replica's task with this title; fails the test if there is not exactly one. */
export function taskTitled(replica: Replica, title: string): Task {
  const matches = [...replica.state().tasks.values()].filter((t) => t.title === title);
  expect(matches.map((t) => t.title)).toEqual([title]);
  return matches[0] as Task;
}

/** The replica's task titles, sorted. */
export function titles(replica: Replica): string[] {
  return [...replica.state().tasks.values()].map((t) => t.title).sort();
}

/** Unwraps a successful result, failing the test otherwise. */
export function ok<T>(result: { ok: true; value: T } | { ok: false; errors: unknown }): T {
  if (!result.ok) expect.fail(`expected ok, got ${JSON.stringify(result.errors)}`);
  return result.value;
}
