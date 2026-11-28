import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import type { SqlDriver, SqlMethod } from './driver.ts';

/**
 * A SqlDriver over Node's built-in SQLite, for every Node process (Electron's main process, tests).
 * `onPrepare` runs on each statement right after it is prepared, inside batches too.
 */
export function nodeSqliteDriver(
  path = ':memory:',
  options: { onPrepare?: (statement: StatementSync, sql: string) => void } = {},
): SqlDriver & { close(): void } {
  const db = new DatabaseSync(path);

  const run = (sql: string, params: unknown[], method: SqlMethod): { rows: unknown[] } => {
    const statement = db.prepare(sql);
    options.onPrepare?.(statement, sql);
    const args = params as SQLInputValue[];
    switch (method) {
      case 'run':
        statement.run(...args);
        return { rows: [] };
      case 'all':
        return { rows: statement.all(...args) };
      case 'values':
        statement.setReturnArrays(true);
        return { rows: statement.all(...args) };
      case 'get': {
        statement.setReturnArrays(true);
        const row = statement.get(...args);
        return { rows: row === undefined ? [] : [row] };
      }
    }
  };

  return {
    exec: (sql, params, method) => {
      try {
        return Promise.resolve(run(sql, params, method));
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
    batch: (queries) => {
      db.exec('BEGIN');
      try {
        const results = queries.map((q) => run(q.sql, q.params, q.method));
        db.exec('COMMIT');
        return Promise.resolve(results);
      } catch (error) {
        db.exec('ROLLBACK');
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
    close: () => {
      db.close();
    },
  };
}
