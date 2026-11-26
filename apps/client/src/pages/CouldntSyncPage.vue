<template>
  <q-page padding>
    <h1 class="text-h5">{{ $t('couldntSync.title') }}</h1>
    <p>{{ $t('couldntSync.message') }}</p>
    <div v-if="error !== null" role="alert" class="text-negative">{{ $t(error) }}</div>
    <q-list v-if="rows.length > 0" separator>
      <q-item v-for="row in rows" :key="row.opId">
        <q-item-section>
          <q-item-label>{{ row.title }}</q-item-label>
          <q-item-label caption>{{ $t(row.errorKey) }}</q-item-label>
        </q-item-section>
        <q-item-section side class="row no-wrap">
          <q-btn
            v-if="row.copyable"
            flat
            color="primary"
            :label="$t('couldntSync.copy')"
            :aria-label="$t('couldntSync.copyTitle', { title: row.title })"
            @click="copy(row.opId)"
          />
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
import { copyRejected } from '@tdl/app-core';
import { computed, ref } from 'vue';
import { useApp } from '@/composables/useApp.ts';
import { rejectedRows } from '@/display/sync-display.ts';
import { errorKey } from '@/forms/account-forms.ts';

const { state } = useApp();

// Read from `state` directly: it is triggered in place when the replica changes.
const rows = computed(() =>
  state.value.kind === 'ready'
    ? rejectedRows(state.value.replica.state(), state.value.replica.rejected())
    : [],
);

const error = ref<string | null>(null);

/** Copies the change into the user's default list as a new task, and drops it from here. */
async function copy(opId: string): Promise<void> {
  if (state.value.kind !== 'ready') return;
  const { replica, me } = state.value;
  const result = await copyRejected(replica, opId, me.defaultListId);
  error.value = result.ok ? null : errorKey(result.errors[0]?.code ?? 'unknown');
}

async function discard(opId: string): Promise<void> {
  if (state.value.kind !== 'ready') return;
  await state.value.replica.discardRejected(opId);
}
</script>
