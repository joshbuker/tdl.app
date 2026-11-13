import type { BindingSpec, Database } from '@sqlite.org/sqlite-wasm';
import type { SqlMethod } from '@tdl/device-store';

/** One query, with how its rows come back (see `SqlDriver`). */
export interface SqlQuery {
  sql: string;
  params: unknown[];
  method: SqlMethod;
}

/** A message to the database worker. `batch` runs its queries in one transaction. */
export type SqlRequest =
  ({ id: number; kind: 'exec' } & SqlQuery) | { id: number; kind: 'batch'; queries: SqlQuery[] };

/** The worker's answer: `result` is `{ rows }` for `exec`, and one `{ rows }` per query for `batch`. */
export type SqlResponse =
  { id: number; ok: true; result: unknown } | { id: number; ok: false; message: string };

/** Runs one request against the open database, in the row formats `SqlDriver` documents. */
export function handleSqlRequest(db: Database, request: SqlRequest): SqlResponse {
  try {
    const result =
      request.kind === 'exec'
        ? runQuery(db, request)
        : db.transaction(() => request.queries.map((query) => runQuery(db, query)));
    return { id: request.id, ok: true, result };
  } catch (error) {
    return { id: request.id, ok: false, message: errorMessage(error) };
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runQuery(db: Database, { sql, params, method }: SqlQuery): { rows: unknown[] } {
  const bind = params as BindingSpec;
  switch (method) {
    case 'run':
      db.exec({ sql, bind });
      return { rows: [] };
    case 'all':
      return { rows: db.exec({ sql, bind, rowMode: 'object', returnValue: 'resultRows' }) };
    case 'values':
      return { rows: db.exec({ sql, bind, rowMode: 'array', returnValue: 'resultRows' }) };
    case 'get':
      return {
        rows: db.exec({ sql, bind, rowMode: 'array', returnValue: 'resultRows' }).slice(0, 1),
      };
  }
}
