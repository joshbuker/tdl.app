import { describe, expect, test } from 'vitest';
import { Replica } from '../src/replica.ts';
import { MemoryStore } from '../src/store.ts';
import { createFakeServer, offline } from './fake-transport.ts';
import { at, createList, createTask, setField } from './ops.ts';

const alice = 'alice';

describe('Version compatibility', () => {
  test('Unknown data is kept', async () => {
    // Given "alice"'s laptop app is on a newer minor version that adds a field, and her phone app is on the older one
    const server = createFakeServer();
    server.seed(
      createList('inbox', at(1), alice),
      createTask('fence', 'inbox', at(2), alice),
      setField('task', 'fence', 'title', 'Paint fence', at(3), alice),
      // When she sets that field on "Paint fence" from her laptop
      setField('task', 'fence', 'colour', 'red', at(4), alice),
    );
    const store = new MemoryStore();
    const phone = await Replica.open({ store, transport: server.transport(alice), userId: alice, deviceId: 'phone' });
    await phone.sync();

    // Then her phone keeps syncing, and doesn't show the field
    expect(phone.status()).toBe('ok');
    const task = phone.state().tasks.get('fence');
    expect(task?.title).toBe('Paint fence');
    expect(Object.keys(task ?? {})).not.toContain('colour');

    // And after she updates the phone app, it shows the field without downloading everything again
    // (the stored operation stays, so an app that knows the field applies it from the store)
    const holdsColour = async (): Promise<boolean> =>
      ((await store.load())?.confirmed ?? []).some((op) => op.content?.field === 'colour' && op.content.value === 'red');
    expect(await holdsColour()).toBe(true);
    await Replica.open({ store, transport: offline(), userId: alice, deviceId: 'phone' });
    expect(await holdsColour()).toBe(true);
  });
});
