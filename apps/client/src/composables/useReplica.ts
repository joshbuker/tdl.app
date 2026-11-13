import type { DeviceState, Replica } from '@tdl/sync';
import { getCurrentScope, onScopeDispose, shallowRef, triggerRef, type ShallowRef } from 'vue';

/** The replica's state, refreshed on each change until the calling component (or scope) goes away. */
export function useReplica(replica: Pick<Replica, 'state' | 'onChange'>): ShallowRef<DeviceState> {
  const state = shallowRef(replica.state());
  const stop = replica.onChange(() => {
    state.value = replica.state();
    triggerRef(state);
  });
  if (getCurrentScope() !== undefined) onScopeDispose(stop);
  return state;
}
