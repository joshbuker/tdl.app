import type { SqlDriver } from './driver.ts';
import { migrations } from './migrations.generated.ts';

const BREAKPOINT = '--> statement-breakpoint';

/** Applies, in order, each bundled migration not yet recorded, each in one transaction with its record. */
export async function migrate(driver: SqlDriver): Promise<void> {
  await driver.exec('CREATE TABLE IF NOT EXISTS __migrations (tag TEXT PRIMARY KEY)', [], 'run');
  const { rows } = await driver.exec('SELECT tag FROM __migrations', [], 'values');
  const applied = new Set(rows.map((row) => (row as unknown[])[0]));
  for (const migration of migrations) {
    if (applied.has(migration.tag)) continue;
    const statements = migration.sql
      .split(BREAKPOINT)
      .map((statement) => statement.trim())
      .filter((statement) => statement !== '');
    await driver.batch([
      ...statements.map((sql) => ({ sql, params: [], method: 'run' as const })),
      { sql: 'INSERT INTO __migrations (tag) VALUES (?)', params: [migration.tag], method: 'run' as const },
    ]);
  }
}
