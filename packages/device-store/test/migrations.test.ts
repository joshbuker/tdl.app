import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { readMigrations, renderMigrations } from '../scripts/bundle-migrations.ts';

test('migrations.generated.ts matches the drizzle folder (run `pnpm --filter @tdl/device-store bundle-migrations`)', () => {
  const generated = readFileSync(fileURLToPath(new URL('../src/migrations.generated.ts', import.meta.url)), 'utf8');
  const folder = fileURLToPath(new URL('../drizzle', import.meta.url));
  expect(generated).toBe(renderMigrations(readMigrations(folder)));
});

test('the drizzle folder has at least one migration', () => {
  expect(readMigrations(fileURLToPath(new URL('../drizzle', import.meta.url))).length).toBeGreaterThan(0);
});
