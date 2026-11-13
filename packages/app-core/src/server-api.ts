import type { AccountInput, FieldError, Id } from '@tdl/domain';
import { errorBodySchema, NetworkError, PROTOCOL_HEADER, PROTOCOL_VERSION, type FetchLike } from '@tdl/sync';
import { z } from 'zod';

/** The server refused a request: its HTTP status and the error contract's `code` (and field errors, for 422). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors?: FieldError[];

  constructor(status: number, code: string, errors?: FieldError[]) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (errors !== undefined) this.errors = errors;
  }
}

// The response shapes of the server's routes (apps/server/src/routes).
const meSchema = z.object({ userId: z.uuid(), username: z.string(), defaultListId: z.uuid() });
const targetSchema = z.object({ kind: z.enum(['list', 'task']), id: z.uuid() });
const roleSchema = z.enum(['editor', 'commenter', 'viewer']);
const invitationSchema = z.object({ id: z.uuid(), inviter: z.object({ username: z.string() }), target: targetSchema, role: roleSchema });
const createdSchema = z.object({ id: z.uuid() });
const sessionSchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastSyncedAt: z.iso.datetime().nullable(),
  current: z.boolean(),
});

export { meSchema };

/** The logged-in user. */
export type Me = z.infer<typeof meSchema>;
/** What can be shared: a list or a single task. */
export type ShareTarget = z.infer<typeof targetSchema>;
export type ShareRole = z.infer<typeof roleSchema>;
/** An invitation the user has received. */
export type Invitation = z.infer<typeof invitationSchema>;
/** One of the user's logged-in devices. */
export type SessionView = z.infer<typeof sessionSchema>;

export interface ServerApiOptions {
  /** The server's URL, e.g. https://tdl.app, without a trailing slash. */
  baseUrl: string;
  fetch?: FetchLike;
  /** A bearer token (native apps). Without one, the session cookie is sent. */
  token?: string;
}

type Method = Parameters<FetchLike>[1]['method'];
type Reply = Awaited<ReturnType<FetchLike>>;

const platformFetch: FetchLike = (url, init) => (globalThis as unknown as { fetch: FetchLike }).fetch(url, init);

/**
 * The server's HTTP API other than sync. Failed requests throw `ApiError`; a server that can't
 * be reached throws `NetworkError`.
 */
export class ServerApi {
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly token: string | undefined;

  constructor(options: ServerApiOptions) {
    this.baseUrl = options.baseUrl;
    this.fetch = options.fetch ?? platformFetch;
    this.token = options.token;
  }

  /** Creates an account. Sends only the keys sign-up accepts. */
  async signUp(input: AccountInput & { acceptTerms: boolean }): Promise<{ token: string | null }> {
    const { username, email, password, givenName, familyName, acceptTerms } = input;
    const reply = await this.send('POST', '/api/auth/sign-up/email', { username, email, password, givenName, familyName, acceptTerms });
    return { token: tokenOf(reply) };
  }

  /** Logs in by email if `identifier` contains `@`, else by username. */
  async logIn(identifier: string, password: string): Promise<{ token: string | null }> {
    const reply = identifier.includes('@')
      ? await this.send('POST', '/api/auth/sign-in/email', { email: identifier, password })
      : await this.send('POST', '/api/auth/sign-in/username', { username: identifier, password });
    return { token: tokenOf(reply) };
  }

  /** Ends this session on the server. */
  async logOut(): Promise<void> {
    await this.send('POST', '/api/auth/sign-out');
  }

  async me(): Promise<Me> {
    return meSchema.parse(await (await this.send('GET', '/api/me')).json());
  }

  async invitations(): Promise<Invitation[]> {
    return z.array(invitationSchema).parse(await (await this.send('GET', '/api/invitations')).json());
  }

  async invite(target: ShareTarget, username: string, role: ShareRole): Promise<{ id: Id }> {
    return createdSchema.parse(await (await this.send('POST', '/api/invitations', { target, username, role })).json());
  }

  async acceptInvitation(id: Id): Promise<void> {
    await this.send('POST', `/api/invitations/${encodeURIComponent(id)}/accept`);
  }

  async declineInvitation(id: Id): Promise<void> {
    await this.send('POST', `/api/invitations/${encodeURIComponent(id)}/decline`);
  }

  /** Leaves a share (as its grantee), or removes a collaborator (as its owner). */
  async removeGrant(id: Id): Promise<void> {
    await this.send('DELETE', `/api/grants/${encodeURIComponent(id)}`);
  }

  async sessions(): Promise<SessionView[]> {
    return z.array(sessionSchema).parse(await (await this.send('GET', '/api/sessions')).json());
  }

  async revokeSession(id: Id): Promise<void> {
    await this.send('DELETE', `/api/sessions/${encodeURIComponent(id)}`);
  }

  /** Sends a request with the session's credentials, returning a 2xx reply. */
  private async send(method: Method, path: string, body?: unknown): Promise<Reply> {
    const headers: Record<string, string> = { [PROTOCOL_HEADER]: PROTOCOL_VERSION };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.token !== undefined) headers.authorization = `Bearer ${this.token}`;
    let reply: Reply;
    try {
      reply = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        ...(this.token === undefined ? { credentials: 'include' as const } : {}),
      });
    } catch (error) {
      throw new NetworkError(error);
    }
    if (reply.status < 200 || reply.status >= 300) throw await apiError(reply);
    return reply;
  }
}

/** The bearer token the server returns at sign-up and login (Better Auth's bearer plugin), if any. */
function tokenOf(reply: Reply): string | null {
  const token = reply.headers.get('set-auth-token');
  return token === null || token === '' ? null : token;
}

async function apiError(reply: Reply): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await reply.json();
  } catch {
    // No JSON body: the code is unknown.
  }
  const parsed = errorBodySchema.safeParse(body);
  return parsed.success ? new ApiError(reply.status, parsed.data.code, parsed.data.errors) : new ApiError(reply.status, 'unknown');
}
