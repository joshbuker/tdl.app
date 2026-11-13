import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { newId, validateAccountInput, type AccountInput, type FieldError } from '@tdl/domain';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import { bearer, username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.ts';
import type { Db } from './db/client.ts';
import * as schema from './db/schema.ts';
import { sendError } from './errors.ts';
import { WS_AUTH_FAILED_CLOSE, type SessionSockets } from './session-sockets.ts';
import { presentedToken } from './session-token.ts';
import { writeServerOps } from './sync/apply.ts';
import type { FeedTransaction } from './sync/feed-transaction.ts';

const DAY = 60 * 60 * 24;

// Account details are counted in characters (code points) by @tdl/domain's validateAccountInput,
// which runs first (in `hooks.before`) and is the authority. Better Auth and its username plugin
// count UTF-16 code units, which for N characters is between N and 2N, so their limits are set
// so they never reject what the domain accepts: min stays (units ≥ characters), max doubles.
const MIN_PASSWORD = 14;
const MAX_PASSWORD = 128;
const MAX_USERNAME = 69;

/** Better Auth reads the client IP from this header only; the bridge sets it from Fastify's `request.ip`, replacing any client value. */
export const CLIENT_IP_HEADER = 'x-tdl-client-ip';

const SIGN_UP_PATH = '/sign-up/email';
const SIGN_OUT_PATH = '/sign-out';
const SIGN_IN_PATHS = new Set(['/sign-in/email', '/sign-in/username']);

// The only keys a sign-up body may have. Better Auth and its plugins would store others as given
// (e.g. `displayUsername`, `image`), bypassing our validation, so any other key is rejected.
// `name` is accepted for compatibility but ignored: the stored name comes from the validated names.
const SIGN_UP_KEYS = new Set(['email', 'password', 'name', 'username', 'givenName', 'familyName', 'acceptTerms']);

// The Better Auth endpoints exposed over HTTP. Everything else (e.g. update-user, which would bypass
// our validation, or revoke-session, which would skip the tombstone) answers 404.
const EXPOSED = new Set([`POST ${SIGN_UP_PATH}`, 'POST /sign-in/email', 'POST /sign-in/username', `POST ${SIGN_OUT_PATH}`]);

export interface AuthDeps {
  db: Db;
  feedTransaction: FeedTransaction;
  now: () => number;
}

export function createAuth(config: Config, deps: AuthDeps) {
  const { db } = deps;

  /** Validates a sign-up body: types, account details (domain rules), terms, then uniqueness. */
  async function validateSignUp(body: unknown): Promise<{ ok: true; value: AccountInput } | { ok: false; errors: FieldError[] }> {
    const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const typeErrors: FieldError[] = [];
    // A missing or non-string field is reported here, and checked as '' below (its errors there are dropped).
    const text = (field: string): string => {
      const value = fields[field];
      if (typeof value === 'string') return value;
      typeErrors.push({ field, code: value === undefined || value === null ? 'required' : 'invalid' });
      return '';
    };
    const input: AccountInput = {
      username: text('username'),
      email: text('email'),
      password: text('password'),
      givenName: text('givenName'),
      familyName: text('familyName'),
    };
    const result = validateAccountInput(input);
    const mistyped = new Set(typeErrors.map((e) => e.field));
    const errors = [...typeErrors, ...(result.ok ? [] : result.errors.filter((e) => !mistyped.has(e.field)))];
    for (const key of Object.keys(fields)) {
      if (!SIGN_UP_KEYS.has(key)) errors.push({ field: key, code: 'unknown-field' });
    }
    if (fields.acceptTerms !== true) errors.push({ field: 'acceptTerms', code: 'required' });

    const invalidFields = new Set(errors.map((e) => e.field));
    if (!invalidFields.has('username')) {
      // The username plugin stores usernames lowercased (`displayUsername` keeps what was typed), so this ignores case.
      const taken = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.username, input.username.toLowerCase()));
      if (taken.length > 0) errors.push({ field: 'username', code: 'taken' });
    }
    if (!invalidFields.has('email')) {
      // Emails are validated as lowercase, and stored as given, so equality ignores case.
      const taken = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, input.email));
      if (taken.length > 0) errors.push({ field: 'email', code: 'taken' });
    }

    if (errors.length > 0 || !result.ok) return { ok: false, errors };
    return { ok: true, value: result.value };
  }

  /** Creates the new user's Inbox through server-made operations, and makes it their default list. */
  async function createInbox(userId: string): Promise<void> {
    const listId = newId();
    try {
      await deps.feedTransaction(async (tx) => {
        await writeServerOps(tx, userId, [
          { id: newId(), record: { type: 'list', id: listId }, meta: { kind: 'createList' }, content: null },
          { id: newId(), record: { type: 'list', id: listId }, meta: null, content: { field: 'title', value: 'Inbox' } },
        ], deps.now);
        await tx.update(schema.user).set({ defaultListId: listId }).where(eq(schema.user.id, userId));
      });
    } catch (error) {
      // Better Auth runs this after its sign-up transaction commits. Without an Inbox the account is
      // unusable, so undo the sign-up (sessions and accounts cascade) and let the request fail.
      await db.delete(schema.user).where(eq(schema.user.id, userId));
      throw error;
    }
  }

  return betterAuth({
    secret: config.authSecret,
    baseURL: config.origin,
    basePath: '/api/auth',
    trustedOrigins: [config.origin],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
    advanced: {
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: MIN_PASSWORD,
      maxPasswordLength: MAX_PASSWORD * 2,
    },
    session: {
      expiresIn: 90 * DAY,
      updateAge: DAY,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        givenName: { type: 'string', required: true },
        familyName: { type: 'string', required: true },
        termsAcceptedAt: { type: 'date', required: false, input: false },
        defaultListId: { type: 'string', required: false, input: false },
      },
    },
    plugins: [
      username({ minUsernameLength: 1, maxUsernameLength: MAX_USERNAME * 2, usernameValidator: () => true }),
      bearer(),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== SIGN_UP_PATH) return;
        const result = await validateSignUp(ctx.body);
        if (!result.ok) throw new APIError('UNPROCESSABLE_ENTITY', { code: 'invalid', errors: result.errors });
        // Built from validated values only. Better Auth merges this over the original body, which
        // validateSignUp has checked holds no other keys.
        const { username, email, password, givenName, familyName } = result.value;
        const body = { username, displayUsername: username, email, password, givenName, familyName, name: `${givenName} ${familyName}` };
        return { context: { body } };
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => Promise.resolve({ data: { ...user, termsAcceptedAt: new Date(deps.now()) } }),
          after: async (user) => {
            await createInbox(user.id);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** The headers Better Auth sees for a Fastify request, with the client IP taken from Fastify (which honours `trustProxy`). */
export function authHeaders(request: FastifyRequest): Headers {
  const headers = fromNodeHeaders(request.headers);
  headers.set(CLIENT_IP_HEADER, request.ip);
  return headers;
}

/** The ID of the session whose token the headers present, if it exists. */
async function sessionIdOf(db: Db, headers: Headers): Promise<string | null> {
  const token = presentedToken(headers);
  if (token === null) return null;
  const [row] = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.token, token));
  return row?.id ?? null;
}

/** Turns a Better Auth error response into an error-contract body. */
function translateError(path: string, status: number, body: unknown): { status: number; code: string; errors?: FieldError[] } {
  const raw = typeof body === 'object' && body !== null ? (body as { code?: unknown; errors?: unknown }) : {};
  const code = typeof raw.code === 'string' ? raw.code : '';
  if (code === 'invalid' && Array.isArray(raw.errors)) return { status: 422, code, errors: raw.errors as FieldError[] };
  if (SIGN_IN_PATHS.has(path) && status === 401) return { status, code: 'invalid-credentials' };
  if (status === 429) return { status, code: 'rate-limited' };
  if (code === 'USERNAME_IS_ALREADY_TAKEN') return { status: 422, code: 'invalid', errors: [{ field: 'username', code: 'taken' }] };
  if (code.startsWith('USER_ALREADY_EXISTS')) return { status: 422, code: 'invalid', errors: [{ field: 'email', code: 'taken' }] };
  if (code === 'VALIDATION_ERROR') return { status: 422, code: 'invalid' };
  if (code === 'INVALID_EMAIL') return { status: 422, code: 'invalid', errors: [{ field: 'email', code: 'invalid' }] };
  if (status >= 500) return { status, code: 'internal-error' };
  return { status, code: code === '' ? 'bad-request' : code.toLowerCase().replaceAll('_', '-') };
}

export interface AuthRouteDeps {
  db: Db;
  sockets: SessionSockets;
}

/**
 * The catch-all `/api/auth/*` bridge: Fastify request → Better Auth handler → Fastify reply.
 * A successful sign-out also closes the session's live-update sockets.
 */
export function registerAuthRoutes(app: FastifyInstance, auth: Auth, config: Config, { db, sockets }: AuthRouteDeps): void {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    // Better Auth's routes are its own; a catch-all documents nothing useful.
    schema: { hide: true },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const url = new URL(request.url, config.origin);
      const path = url.pathname.slice('/api/auth'.length);
      if (!EXPOSED.has(`${request.method} ${path}`)) return sendError(reply, 404, 'not-found');

      const headers = authHeaders(request);
      // Looked up first: Better Auth deletes the session when signing out.
      const signingOut = path === SIGN_OUT_PATH ? await sessionIdOf(db, headers) : null;
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
        }),
      );
      if (signingOut !== null && response.status >= 200 && response.status < 300) sockets.close(signingOut, WS_AUTH_FAILED_CLOSE);

      void reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie' && key !== 'content-length') void reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) void reply.header('set-cookie', cookies);

      const text = await response.text();
      if (response.status < 400) return reply.send(text === '' ? null : text);

      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        // Not JSON: translated from the status alone.
      }
      const error = translateError(path, response.status, body);
      const retryAfter = response.headers.get('x-retry-after');
      if (error.status === 429 && retryAfter !== null) void reply.header('retry-after', retryAfter);
      return sendError(reply, error.status, error.code, error.errors);
    },
  });
}
