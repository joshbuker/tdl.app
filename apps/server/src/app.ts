import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify, { type FastifyInstance } from 'fastify';
import type { FieldError } from '@tdl/domain';
import { z } from 'zod';
import { createAuth, registerAuthRoutes } from './auth.ts';
import type { Config } from './config.ts';
import type { Db } from './db/client.ts';
import { sendError } from './errors.ts';
import { registerGrantRoutes } from './routes/grants.ts';
import { registerInvitationRoutes } from './routes/invitations.ts';
import { registerMeRoutes } from './routes/me.ts';
import { registerSessionRoutes } from './routes/sessions.ts';
import { registerSyncPullRoutes } from './routes/sync-pull.ts';
import { registerSyncPushRoutes } from './routes/sync-push.ts';
import { registerSyncWsRoutes } from './routes/sync-ws.ts';
import { createSessionGuard } from './session-guard.ts';
import { createSessionSockets, type SessionSockets } from './session-sockets.ts';
import { createFeedTransaction } from './sync/feed-transaction.ts';
import { createNotifier, type Notifier } from './sync/notifier.ts';

export interface AppDeps {
  db: Db;
  now?: () => number;
  /** Hears whenever a user's feed grows. Defaults to a fresh in-process one. */
  notifier?: Notifier;
  /** The open websockets of each session. Defaults to a fresh registry. */
  sessionSockets?: SessionSockets;
}

// Notifications are small; nothing a device sends is read.
const MAX_WS_PAYLOAD = 1024;

export async function buildApp(config: Config, deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: config.trustProxy });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: { info: { title: 'TDL App API', version: '0.0.0' } },
    transform: jsonSchemaTransform,
  });
  await app.register(helmet);
  await app.register(websocket, { options: { maxPayload: MAX_WS_PAYLOAD } });
  await app.register(cors, { origin: config.origin, credentials: true });
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      code: 'rate-limited',
      retryAfterSeconds: Math.ceil(context.ttl / 1000),
    }),
  });

  app.setNotFoundHandler((_request, reply) => sendError(reply, 404, 'not-found'));
  app.setErrorHandler((error: unknown, request, reply) => {
    const details = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
    const status = typeof details.statusCode === 'number' ? details.statusCode : 500;
    if (Array.isArray(details.validation)) {
      const errors: FieldError[] = (details.validation as { instancePath?: string }[]).map((issue) => ({
        field: (issue.instancePath ?? '').replace(/^\//, '').replaceAll('/', '.'),
        code: 'invalid',
      }));
      return sendError(reply, 422, 'invalid', errors);
    }
    if (status === 429) {
      if (typeof details.retryAfterSeconds === 'number') void reply.header('retry-after', details.retryAfterSeconds);
      return sendError(reply, 429, 'rate-limited');
    }
    if (status >= 400 && status < 500) return sendError(reply, status, 'bad-request');
    request.log.error(error);
    return sendError(reply, 500, 'internal-error');
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    () => ({ ok: true as const }),
  );

  const { db } = deps;
  const now = deps.now ?? Date.now;
  const notifier = deps.notifier ?? createNotifier();
  const sockets = deps.sessionSockets ?? createSessionSockets();
  const feedTransaction = createFeedTransaction(db, notifier);
  const auth = createAuth(config, { db, feedTransaction, now });
  const requireSession = createSessionGuard(auth, db);
  registerAuthRoutes(app, auth, config);
  await app.register(
    (api, _options, done) => {
      registerMeRoutes(api, db, requireSession);
      registerSessionRoutes(api, { db, auth, sockets }, requireSession);
      registerSyncPushRoutes(api, { db, feedTransaction, now }, requireSession);
      registerSyncPullRoutes(api, db, requireSession, now);
      registerSyncWsRoutes(api, { db, notifier, sockets, origin: config.origin }, requireSession);
      registerInvitationRoutes(api, { db, feedTransaction, now }, requireSession);
      registerGrantRoutes(api, feedTransaction, requireSession, now);
      done();
    },
    { prefix: '/api' },
  );

  return app;
}
