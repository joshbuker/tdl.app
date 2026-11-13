<template>
  <q-page padding>
    <h1 class="text-h5">{{ $t('couldntSync.title') }}</h1>
    <p>{{ $t('couldntSync.message') }}</p>
    <q-list v-if="rows.length > 0" separator>
      <q-item v-for="row in rows" :key="row.opId">
        <q-item-section>
          <q-item-label>{{ row.title }}</q-item-label>
          <q-item-label caption>{{ $t(row.errorKey) }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            color="negative"
            :label="$t('couldntSync.discard')"
            :aria-label="$t('couldntSync.discardTitle', { title: row.title })"
            @click="discard(row.opId)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <p v-else>{{ $t('couldntSync.empty') }}</p>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApp } from '@/composables/useApp.ts';
import { rejectedRows } from '@/display/sync-display.ts';

const { state } = useApp();

// Read from `state` directly: it is triggered in place when the replica changes.
const rows = computed(() =>
  state.value.kind === 'ready'
    ? rejectedRows(state.value.replica.state(), state.value.replica.rejected())
    : [],
);

async function discard(opId: string): Promise<void> {
  if (state.value.kind !== 'ready') return;
  await state.value.replica.discardRejected(opId);
}
</script>
