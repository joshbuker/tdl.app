<template>
  <div v-if="view !== null" class="row items-center no-wrap q-gutter-x-sm">
    <div role="status" :aria-label="$t('syncStatus.label')" class="row items-center no-wrap">
      <q-icon :name="view.icon" :color="view.color" size="sm" left />
      <span>{{ $t(view.textKey) }}</span>
      <span v-if="view.reasonKey !== null" class="q-ml-xs">{{ $t(view.reasonKey) }}</span>
      <span v-if="view.pending > 0" class="q-ml-sm">
        {{ $t('syncStatus.pending', { count: view.pending }, view.pending) }}
      </span>
    </div>
    <q-btn
      v-if="view.rejected > 0"
      flat
      dense
      no-caps
      to="/couldnt-sync"
      :label="$t('syncStatus.rejected', { count: view.rejected }, view.rejected)"
    />
    <q-btn v-if="view.reload" flat dense no-caps :label="$t('syncStatus.reload')" @click="reload" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApp } from '@/composables/useApp.ts';
import { syncStatusView } from '@/display/sync-display.ts';

const { state } = useApp();

// Read from `state` directly: it is triggered in place when the replica changes.
const view = computed(() =>
  state.value.kind === 'ready' ? syncStatusView(state.value.replica) : null,
);

function reload(): void {
  location.reload();
}
</script>
