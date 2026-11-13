import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { openDeviceStore, type SqlDriver } from '@tdl/device-store';
import { afterEach, describe, expect, test } from 'vitest';
import { describeReplicaStore } from '../../../../../packages/device-store/test/store-contract.ts';
import { handleSqlRequest, type SqlRequest } from './sql-protocol.ts';
import { portDriver, type SqlPort } from './web-driver.ts';

// The real SQLite Wasm (its Node build), in memory, behind a MessageChannel: everything the
// browser's worker does except opening the OPFS database.
const sqlite3 = await sqlite3InitModule();
const channels: MessageChannel[] = [];

function makeDriver(): SqlDriver {
  const db = new sqlite3.oo1.DB(':memory:');
  const channel = new MessageChannel();
  channels.push(channel);
  channel.port1.onmessage = (event: MessageEvent<SqlRequest>) => {
    channel.port1.postMessage(handleSqlRequest(db, event.data));
  };
  channel.port2.start();
  return portDriver(channel.port2);
}

afterEach(() => {
  for (const channel of channels.splice(0)) {
    channel.port1.close();
    channel.port2.close();
  }
});

describeReplicaStore(
  'Web SQLite store',
  async () => (await openDeviceStore(makeDriver())).replicaStore,
);

describe('web driver', () => {
  const seeded = async (): Promise<SqlDriver> => {
    const driver = makeDriver();
    await driver.exec('CREATE TABLE t (a INTEGER, b TEXT)', [], 'run');
    await driver.exec('INSERT INTO t VALUES (?, ?), (?, ?)', [1, 'x', 2, null], 'run');
    return driver;
  };

  test('run returns no rows', async () => {
    const driver = await seeded();
    expect(await driver.exec('UPDATE t SET b = ? WHERE a = ?', ['y', 1], 'run')).toEqual({
      rows: [],
    });
  });

  test('values returns every row as an array', async () => {
    const driver = await seeded();
    expect(await driver.exec('SELECT a, b FROM t ORDER BY a', [], 'values')).toEqual({
      rows: [
        [1, 'x'],
        [2, null],
      ],
    });
  });

  test('all returns every row as an object keyed by column', async () => {
    const driver = await seeded();
    expect(await driver.exec('SELECT a, b FROM t ORDER BY a', [], 'all')).toEqual({
      rows: [
        { a: 1, b: 'x' },
        { a: 2, b: null },
      ],
    });
  });

  test('get returns only the first row, as an array', async () => {
    const driver = await seeded();
    expect(await driver.exec('SELECT a, b FROM t ORDER BY a', [], 'get')).toEqual({
      rows: [[1, 'x']],
    });
    expect(await driver.exec('SELECT a FROM t WHERE a = ?', [3], 'get')).toEqual({ rows: [] });
  });

  test('batch returns each query its rows', async () => {
    const driver = await seeded();
    expect(
      await driver.batch([
        { sql: 'INSERT INTO t VALUES (?, ?)', params: [3, 'z'], method: 'run' },
        { sql: 'SELECT count(*) FROM t', params: [], method: 'get' },
        { sql: 'SELECT a FROM t ORDER BY a', params: [], method: 'values' },
      ]),
    ).toEqual([{ rows: [] }, { rows: [[3]] }, { rows: [[1], [2], [3]] }]);
  });

  test('a failing batch changes nothing, and its error comes back', async () => {
    const driver = await seeded();
    await expect(
      driver.batch([
        { sql: 'INSERT INTO t VALUES (?, ?)', params: [3, 'z'], method: 'run' },
        { sql: 'INSERT INTO missing VALUES (1)', params: [], method: 'run' },
      ]),
    ).rejects.toThrow(/no such table: missing/);
    expect(await driver.exec('SELECT count(*) FROM t', [], 'get')).toEqual({ rows: [[2]] });
  });

  test('a failing query rejects without stopping later ones', async () => {
    const driver = await seeded();
    const failing = driver.exec('SELECT * FROM missing', [], 'all');
    const next = driver.exec('SELECT count(*) FROM t', [], 'get');
    await expect(failing).rejects.toThrow(/no such table: missing/);
    expect(await next).toEqual({ rows: [[2]] });
  });

  test('an unreadable message fails waiting and later queries', async () => {
    const channel = new MessageChannel();
    channels.push(channel);
    channel.port2.start();
    const driver = portDriver(channel.port2);
    const waiting = driver.exec('SELECT 1', [], 'values');
    channel.port2.dispatchEvent(new Event('messageerror'));
    await expect(waiting).rejects.toThrow('database-worker-messageerror');
    await expect(driver.exec('SELECT 1', [], 'values')).rejects.toThrow(
      'database-worker-messageerror',
    );
  });

  test('a worker that fails fails waiting and later queries', async () => {
    const posted: SqlRequest[] = [];
    const worker = Object.assign(new EventTarget(), {
      postMessage: (message: SqlRequest) => {
        posted.push(message);
      },
    });
    // A plain EventTarget types its listeners as taking any Event.
    const driver = portDriver(worker as unknown as SqlPort);
    const waiting = driver.batch([{ sql: 'SELECT 1', params: [], method: 'values' }]);
    worker.dispatchEvent(new Event('error'));
    await expect(waiting).rejects.toThrow('database-worker-error');
    await expect(driver.exec('SELECT 1', [], 'values')).rejects.toThrow('database-worker-error');
    expect(posted).toHaveLength(1);
  });

  test('a store opened over it keeps key-value pairs', async () => {
    const { keyValue } = await openDeviceStore(makeDriver());
    await keyValue.set('me', { userId: 'u' });
    expect(await keyValue.get('me')).toEqual({ userId: 'u' });
  });
});
