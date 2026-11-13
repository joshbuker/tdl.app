<template>
  <q-dialog
    :model-value="warning !== null"
    persistent
    aria-labelledby="log-out-title"
    @update:model-value="(open: boolean) => open || emit('close')"
  >
    <q-card v-if="warning !== null" style="min-width: 320px">
      <q-card-section>
        <div id="log-out-title" class="text-h6">{{ $t('logOut.title') }}</div>
        <p class="q-mb-none">{{ $t('logOut.message', { count: warning.count }, warning.count) }}</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="negative" :label="$t('logOut.discard')" @click="emit('discard')" />
        <q-btn
          color="primary"
          :label="warning.sessionEnded ? $t('logOut.logInAgain') : $t('logOut.stay')"
          @click="emit('close')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import type { UnsyncedWarning } from '@/forms/log-out.ts';

defineProps<{ warning: UnsyncedWarning | null }>();
// "Log in again" and "Stay logged in" both close the warning: with the session ended, the
// log-in-again dialog then shows again.
const emit = defineEmits<{ close: []; discard: [] }>();
</script>
