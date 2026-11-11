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
import { z } from 'zod';
import type { Config } from './config.ts';
import type { Db } from './db/client.ts';
import { sendError } from './errors.ts';

export interface AppDeps {
  db: Db;
  now?: () => number;
}

// `deps` is used by the routes added in later tasks.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      code: 'rate-limited',
      retryAfterSeconds: Math.ceil(context.ttl / 1000),
    }),
  });

  app.setNotFoundHandler((_request, reply) => sendError(reply, 404, 'not-found'));
  app.setErrorHandler((error, request, reply) => {
    const status = error !== null && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 500;
    if (status === 429) return reply.code(429).send(error);
    if (status >= 400 && status < 500) return sendError(reply, status, 'bad-request');
    request.log.error(error);
    return sendError(reply, 500, 'internal-error');
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    () => ({ ok: true as const }),
  );

  await app.ready();
  return app;
}
