import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SqlDriver, SqlMethod } from '../src/driver.ts';

/** A SqlDriver over Node's built-in SQLite, for tests. */
export function nodeSqliteDriver(path = ':memory:'): SqlDriver & { close(): void } {
  const db = new DatabaseSync(path);

  const run = (sql: string, params: unknown[], method: SqlMethod): { rows: unknown[] } => {
    const statement = db.prepare(sql);
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
    exec: (sql, params, method) => Promise.resolve(run(sql, params, method)),
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
