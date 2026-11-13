import type { Operation, PullPage, PushResult } from './operations.ts';

/** How a Replica talks to the server. Implementations validate replies with the Zod schemas. */
export interface Transport {
  /** One result per operation, in order. At most 500 operations per call. */
  push(ops: Operation[]): Promise<PushResult[]>;
  pull(after: number, limit: number): Promise<PullPage>;
  /** Calls `onFeed` with the latest feed ID whenever the feed grows. Returns an unsubscribe function. */
  subscribe(onFeed: (id: number) => void): () => void;
  /** The protocol version the server last answered with; null before any reply that carried one. */
  serverVersion(): string | null;
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

/** The server refused the app's protocol version (426). Changes stay queued until the versions are compatible. */
export class VersionError extends Error {
  /** The server's version, from its reply; null if the reply carried none. */
  readonly serverVersion: string | null;
  /** The version the app sent. */
  readonly appVersion: string;

  constructor(serverVersion: string | null, appVersion: string) {
    super('protocol-mismatch');
    this.name = 'VersionError';
    this.serverVersion = serverVersion;
    this.appVersion = appVersion;
  }
}

/** The server refused the request for another reason (a client error other than 401, 426 or 429). Sync is stuck until it changes. */
export class RefusedError extends Error {
  readonly status: number;
  /** The error contract's `code`. */
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'RefusedError';
    this.status = status;
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
