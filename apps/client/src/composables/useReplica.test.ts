import { materialize, type DeviceState } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import { effectScope } from 'vue';
import { useReplica } from './useReplica.ts';

function fakeReplica() {
  let current: DeviceState = materialize([]);
  const listeners = new Set<() => void>();
  return {
    state: () => current,
    onChange(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    change(next: DeviceState) {
      current = next;
      for (const listener of listeners) listener();
    },
    listeners,
  };
}

describe('useReplica', () => {
  test('follows the replica state, until its scope stops', () => {
    const replica = fakeReplica();
    const scope = effectScope();
    const state = scope.run(() => useReplica(replica));
    expect(state?.value).toBe(replica.state());

    const next = materialize([]);
    replica.change(next);
    expect(state?.value).toBe(next);

    scope.stop();
    expect(replica.listeners.size).toBe(0);
  });
});
