import type { Operation, PullPage, PushResult } from './operations.ts';

/** How a Replica talks to the server. Implementations validate replies with the Zod schemas. */
export interface Transport {
  /** One result per operation, in order. At most 500 operations per call. */
  push(ops: Operation[]): Promise<PushResult[]>;
  pull(after: number, limit: number): Promise<PullPage>;
  /** Calls `onFeed` with the latest feed ID whenever the feed grows. Returns an unsubscribe function. */
  subscribe(onFeed: (id: number) => void): () => void;
}

/** The session is no longer valid. `session-revoked` means this device was revoked and must wipe its data. */
export class SessionError extends Error {
  readonly code: 'session-revoked' | 'session-expired';

  constructor(code: 'session-revoked' | 'session-expired') {
    super(code);
    this.name = 'SessionError';
    this.code = code;
  }
}

/** The server could not be reached, or its reply was lost. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('network', cause === undefined ? undefined : { cause });
    this.name = 'NetworkError';
  }
}
