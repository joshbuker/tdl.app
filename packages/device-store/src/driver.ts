import type { SqliteProxyExecutors } from 'drizzle-orm/sqlite-proxy';

/** How a query's rows come back from `SqlDriver.exec`. */
export type SqlMethod = 'run' | 'all' | 'values' | 'get';

/**
 * The SQL a device's database must run: each platform supplies one (SQLite Wasm on the web,
 * `node:sqlite` in tests). Rows come back by method:
 *
 * - `run`: no rows.
 * - `all`: every row, as an object keyed by column name.
 * - `values`: every row, as an array of column values in order.
 * - `get`: the first row only (or none), as an array of column values.
 */
export interface SqlDriver {
  exec(sql: string, params: unknown[], method: SqlMethod): Promise<{ rows: unknown[] }>;
  /** Runs every query in one transaction: all of them take effect, or none does. */
  batch(queries: { sql: string; params: unknown[]; method: SqlMethod }[]): Promise<{ rows: unknown[] }[]>;
}

type RowMode = 'array' | 'object' | undefined;

/** Drizzle's `sqlite-proxy` executors over a SqlDriver. */
export function proxyExecutors(driver: SqlDriver): SqliteProxyExecutors {
  const method = (kind: 'all' | 'get', rowMode: RowMode): SqlMethod => {
    if (rowMode === 'object') return 'all';
    return kind === 'get' ? 'get' : 'values';
  };
  const all = async (sql: string, params: unknown[], rowMode?: RowMode) => (await driver.exec(sql, params, method('all', rowMode))).rows;
  const get = async (sql: string, params: unknown[], rowMode?: RowMode) => (await driver.exec(sql, params, method('get', rowMode))).rows[0];
  return {
    all: all as SqliteProxyExecutors['all'],
    get: get as SqliteProxyExecutors['get'],
    run: async (sql, params) => {
      await driver.exec(sql, params, 'run');
    },
    batch: async (items) => {
      const results = await driver.batch(
        items.map((item) => ({
          sql: item.sql,
          params: item.params,
          method: item.method === 'run' ? 'run' : method(item.method, item.rowMode),
        })),
      );
      return results.map((result, i) => (items[i]?.method === 'get' ? result.rows[0] : result.rows));
    },
  };
}
