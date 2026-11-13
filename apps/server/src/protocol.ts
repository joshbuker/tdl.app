import { parseProtocolVersion, PROTOCOL_HEADER } from '@tdl/sync';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendError } from './errors.ts';

type Hook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export interface RequireProtocol {
  /** For HTTP requests, which send the version in `TDL-Protocol`. */
  header: Hook;
  /** For the websocket, which browsers can't give headers: the version is in the `protocol` query parameter. */
  query: Hook;
}

/**
 * Refuses a sync request whose protocol version is missing, malformed or of another major version
 * than the server's, with 426 `protocol-mismatch`. The server doesn't translate old formats (see
 * docs/design-decisions/protocol-versions.md). Runs as an `onRequest` hook, before the session check.
 */
export function createProtocolCheck(serverVersion: string): RequireProtocol {
  const ours = parseProtocolVersion(serverVersion);
  if (ours === null) throw new Error(`invalid protocol version ${serverVersion}`);
  const check =
    (sent: (request: FastifyRequest) => unknown): Hook =>
    async (request, reply) => {
      const value = sent(request);
      const theirs = typeof value === 'string' ? parseProtocolVersion(value) : null;
      if (theirs?.major !== ours.major) await sendError(reply, 426, 'protocol-mismatch');
    };
  return {
    header: check((request) => request.headers[PROTOCOL_HEADER]),
    query: check((request) => (request.query as { protocol?: unknown }).protocol),
  };
}
