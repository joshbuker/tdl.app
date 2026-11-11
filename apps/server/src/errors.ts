import type { FieldError } from '@tdl/domain';
import type { ErrorBody } from '@tdl/sync';
import type { FastifyReply } from 'fastify';

/** Sends an error-contract body: `{ code, errors? }` (see docs/design-decisions/error-contract.md). */
export function sendError(reply: FastifyReply, status: number, code: string, errors?: FieldError[]): FastifyReply {
  const body: ErrorBody = errors === undefined ? { code } : { code, errors };
  return reply.code(status).send(body);
}
