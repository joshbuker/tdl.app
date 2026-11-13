import { newId } from '@tdl/domain';
import { MemoryStore } from '@tdl/sync';
import { afterEach, describe, expect, test } from 'vitest';
import { ok, settle, startServer, titles, type TestServer } from './harness.ts';

describe('Version compatibility', () => {
  let server: TestServer | undefined;
  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  /**
   * Alice's phone on protocol 1.0 against a 2.0 server, with "Paint fence" saved but unsynced. The
   * phone has never synced, so it makes its own list for the task.
   */
  async function outdatedPhone() {
    server = await startServer({ protocolVersion: '2.0' });
    const alice = await server.signUp('alice');
    const store = new MemoryStore();
    const deviceId = newId();
    const phone = await server.device(alice, { protocolVersion: '1.0', store, deviceId });
    const house = ok(await phone.createList('House'));
    ok(await phone.createTask(house, 'Paint fence'));
    await phone.sync();
    return { server, alice, store, deviceId, phone };
  }

  test('Outdated app keeps working', async () => {
    // Given "alice"'s phone app is on an older major version than her server
    // When she edits "Paint fence"
    const { phone } = await outdatedPhone();

    // Then the change is saved on her phone, and a banner says to update the app to sync
    expect(titles(phone)).toEqual(['Paint fence']);
    expect(phone.status()).toBe('app-outdated');
    expect(phone.pending()).not.toEqual([]);
  });

  test('Updating syncs queued changes', async () => {
    // Given "alice"'s outdated phone app has queued changes to "Paint fence"
    const { server, alice, store, deviceId, phone } = await outdatedPhone();
    expect(phone.pending()).not.toEqual([]);

    // When she updates the app (the same store, opened by the new version)
    const updated = await server.device(alice, { protocolVersion: '2.0', store, deviceId });
    await settle(updated);

    // Then the changes sync, and none are lost
    expect(updated.status()).toBe('ok');
    expect(updated.pending()).toEqual([]);
    const laptop = await server.device(alice, { protocolVersion: '2.0' });
    expect(titles(laptop)).toEqual(['Paint fence']);
    expect([...laptop.state().lists.values()].map((l) => l.title)).toContain('House');
  });

  test('Server too old', async () => {
    // Given "tdl.example.com" runs a major version two or more behind "alice"'s app
    server = await startServer({ protocolVersion: '1.0' });
    const alice = await server.signUp('alice');
    const phone = await server.device(alice, { protocolVersion: '3.0' });
    const house = ok(await phone.createList('House'));
    ok(await phone.createTask(house, 'Paint fence'));

    // When the app syncs
    await phone.sync();

    // Then she is told tdl.example.com needs updating
    expect(phone.status()).toBe('server-outdated');

    // And her changes are saved on the device and queued
    expect(titles(phone)).toEqual(['Paint fence']);
    expect(phone.pending()).not.toEqual([]);
  });
});
