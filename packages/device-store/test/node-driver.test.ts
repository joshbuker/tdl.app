import { describe, expect, test } from 'vitest';
import { nodeSqliteDriver } from '../src/node-driver.ts';
import { checkColumns } from './check-columns.ts';

describe('checkColumns', () => {
  const driver = () => nodeSqliteDriver(':memory:', { onPrepare: checkColumns });

  test('rejects a query with two columns of the same name', async () => {
    await expect(driver().exec('select 1 as id, 2 as id', [], 'all')).rejects.toThrow('duplicate-column-names: select 1 as id, 2 as id');
  });

  test('passes a query whose column names differ', async () => {
    expect((await driver().exec('select 1 as a, 2 as b', [], 'all')).rows).toEqual([{ a: 1, b: 2 }]);
  });

  test('checks each statement in a batch, and rolls back', async () => {
    const d = driver();
    await expect(
      d.batch([
        { sql: 'select 1 as a, 2 as b', params: [], method: 'all' },
        { sql: 'select 1 as id, 2 as id', params: [], method: 'all' },
      ]),
    ).rejects.toThrow('duplicate-column-names');
    expect((await d.batch([{ sql: 'select 1 as a, 2 as b', params: [], method: 'all' }]))[0]?.rows).toEqual([{ a: 1, b: 2 }]);
  });
});
