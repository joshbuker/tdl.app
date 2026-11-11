import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
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
import { registerMeRoutes } from './routes/me.ts';
import { registerSessionRoutes } from './routes/sessions.ts';
import { registerSyncPushRoutes } from './routes/sync-push.ts';
import { createSessionGuard } from './session-guard.ts';

export interface AppDeps {
  db: Db;
  now?: () => number;
}

export async function buildApp(config: Config, deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: config.trustProxy });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: { info: { title: 'TDL App API', version: '0.0.0' } },
    transform: jsonSchemaTransform,
  });
  await app.register(helmet);
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

  const now = deps.now ?? Date.now;
  const auth = createAuth(config, { db: deps.db, now });
  const requireSession = createSessionGuard(auth, deps.db);
  registerAuthRoutes(app, auth, config);
  registerMeRoutes(app, deps.db, requireSession);
  registerSessionRoutes(app, deps.db, auth, requireSession);
  registerSyncPushRoutes(app, deps.db, requireSession, now);

  return app;
}
