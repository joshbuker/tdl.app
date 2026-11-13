import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore, type RejectedOp } from '@tdl/sync';
import { afterEach, describe, expect, test } from 'vitest';
import { openDeviceStore } from '../src/index.ts';
import { migrate } from '../src/migrate.ts';
import { nodeSqliteDriver } from './node-driver.ts';
import { describeReplicaStore, ops } from './store-contract.ts';

describeReplicaStore('MemoryStore', () => Promise.resolve(new MemoryStore()));
describeReplicaStore('SQLite store', async () => (await openDeviceStore(nodeSqliteDriver())).replicaStore);

describe('SQLite store', () => {
  const dirs: string[] = [];
  const tempFile = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'tdl-device-store-'));
    dirs.push(dir);
    return join(dir, 'replica.sqlite');
  };

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  test('a reopened store loads everything written before', async () => {
    const path = tempFile();
    const first = nodeSqliteDriver(path);
    const { replicaStore, keyValue } = await openDeviceStore(first);
    const confirmed = ops.confirmed(ops.createList('a'), 1);
    const pending = ops.createList('b');
    const rejected: RejectedOp = {
      op: ops.setTitle('list', 'a', ''),
      code: 'invalid',
      errors: [{ field: 'title', code: 'required' }],
      at: '2026-11-13T10:00:00.000Z',
    };
    const unknown = { id: 2, kind: 'merge', from: 'a', to: 'b' };
    await replicaStore.init('user-1', 'device-1');
    await replicaStore.appendConfirmed([confirmed], 1);
    await replicaStore.putUnknown([unknown], 2);
    await replicaStore.putPending(pending);
    await replicaStore.putRejected(rejected);
    await keyValue.set('session', { expiresAt: '2026-12-01T00:00:00.000Z' });
    first.close();

    const reopened = await openDeviceStore(nodeSqliteDriver(path));
    expect(await reopened.replicaStore.load()).toEqual({
      userId: 'user-1',
      deviceId: 'device-1',
      cursor: 2,
      confirmed: [confirmed],
      pending: [pending],
      rejected: [rejected],
      unknown: [unknown],
    });
    expect(await reopened.keyValue.get('session')).toEqual({ expiresAt: '2026-12-01T00:00:00.000Z' });
  });

  test('migrate twice applies nothing the second time', async () => {
    const driver = nodeSqliteDriver();
    await migrate(driver);
    const applied = await driver.exec('SELECT tag FROM __migrations', [], 'values');
    const statements: string[] = [];
    const watched = {
      exec: (sql: string, params: unknown[], method: 'run' | 'all' | 'values' | 'get') => driver.exec(sql, params, method),
      batch: (queries: { sql: string; params: unknown[]; method: 'run' | 'all' | 'values' | 'get' }[]) => {
        statements.push(...queries.map((q) => q.sql));
        return driver.batch(queries);
      },
    };
    await migrate(watched);
    expect(statements).toEqual([]);
    expect((await driver.exec('SELECT tag FROM __migrations', [], 'values')).rows).toEqual(applied.rows);
    expect(applied.rows.length).toBeGreaterThan(0);
  });

  test('a failed migration leaves nothing behind', async () => {
    const driver = nodeSqliteDriver();
    const failing = {
      exec: (sql: string, params: unknown[], method: 'run' | 'all' | 'values' | 'get') => driver.exec(sql, params, method),
      batch: (queries: { sql: string; params: unknown[]; method: 'run' | 'all' | 'values' | 'get' }[]) =>
        driver.batch([...queries, { sql: 'SELECT * FROM no_such_table', params: [], method: 'run' as const }]),
    };
    await expect(migrate(failing)).rejects.toThrow();
    expect((await driver.exec("SELECT name FROM sqlite_master WHERE name = 'replica'", [], 'values')).rows).toEqual([]);
  });
});

describe('KeyValue', () => {
  test('values round-trip, and a missing key is null', async () => {
    const { keyValue } = await openDeviceStore(nodeSqliteDriver());
    expect(await keyValue.get('missing')).toBeNull();
    await keyValue.set('settings', { theme: 'dark', zoom: 1.5, tags: ['a', null, true] });
    await keyValue.set('count', 3);
    await keyValue.set('count', 4);
    expect(await keyValue.get('settings')).toEqual({ theme: 'dark', zoom: 1.5, tags: ['a', null, true] });
    expect(await keyValue.get('count')).toBe(4);
  });

  test('clear removes every value', async () => {
    const { keyValue } = await openDeviceStore(nodeSqliteDriver());
    await keyValue.set('a', 'one');
    await keyValue.clear();
    expect(await keyValue.get('a')).toBeNull();
  });

  test('wipe also clears it', async () => {
    const { replicaStore, keyValue } = await openDeviceStore(nodeSqliteDriver());
    await replicaStore.init('user-1', 'device-1');
    await keyValue.set('a', 'one');
    await replicaStore.wipe();
    expect(await keyValue.get('a')).toBeNull();
  });
});
