import type { StatementSync } from 'node:sqlite';

/** An `onPrepare` hook for tests: Android's SQLite plugin keys rows by column name, so two same-named columns would lose one. */
export function checkColumns(statement: StatementSync, sql: string): void {
  const names = statement.columns().map((column) => column.name);
  if (new Set(names).size !== names.length) throw new Error(`duplicate-column-names: ${sql}`);
}
