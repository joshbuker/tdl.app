import type { SqlDriver } from '@tdl/device-store';
import type { SqlQuery, SqlRequest, SqlResponse } from './sql-protocol.ts';

/** The side of a worker (or a MessagePort) the page talks to. */
export interface SqlPort {
  postMessage(message: SqlRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<SqlResponse>) => void): void;
}

/** A SqlDriver over SQLite Wasm, in a worker that keeps the database in the origin private file system. */
export function createWebDriver(): Promise<SqlDriver> {
  const worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
  return Promise.resolve(portDriver(worker));
}

/** A SqlDriver that sends each query to `port`, and matches each answer to its query by ID. */
export function portDriver(port: SqlPort): SqlDriver {
  let nextId = 1;
  const waiting = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();

  port.addEventListener('message', ({ data }) => {
    const entry = waiting.get(data.id);
    if (entry === undefined) return;
    waiting.delete(data.id);
    if (data.ok) entry.resolve(data.result);
    else entry.reject(new Error(data.message));
  });

  const send = <T>(
    request: { kind: 'exec'; query: SqlQuery } | { kind: 'batch'; queries: SqlQuery[] },
  ): Promise<T> => {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      waiting.set(id, { resolve: resolve as (result: unknown) => void, reject });
      port.postMessage(
        request.kind === 'exec'
          ? { id, kind: 'exec', ...request.query }
          : { id, kind: 'batch', queries: request.queries },
      );
    });
  };

  return {
    exec: (sql, params, method) => send({ kind: 'exec', query: { sql, params, method } }),
    batch: (queries) => send({ kind: 'batch', queries }),
  };
}
