<template>
  <q-page padding>
    <h1 class="text-h5">{{ $t('devices.title') }}</h1>
    <div v-if="error !== null" role="alert" class="text-negative">{{ $t(error) }}</div>
    <q-list separator>
      <q-item v-for="session in sessions" :key="session.id">
        <q-item-section>
          <q-item-label class="ellipsis">{{ deviceName(session) }}</q-item-label>
          <q-item-label caption>
            {{
              session.lastSyncedAt === null
                ? $t('devices.neverSynced')
                : $t('devices.lastSynced', {
                    when: new Date(session.lastSyncedAt).toLocaleString(locale),
                  })
            }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge v-if="session.current" color="primary" :label="$t('devices.current')" />
          <q-btn
            v-else
            flat
            color="negative"
            :label="$t('devices.revoke')"
            :aria-label="$t('devices.revokeDevice', { device: deviceName(session) })"
            @click="revoke(session.id)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import type { SessionView } from '@tdl/app-core';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApp } from '@/composables/useApp.ts';
import { formErrors } from '@/forms/account-forms.ts';

const { controller } = useApp();
const { t, locale } = useI18n();
const sessions = ref<SessionView[]>([]);
const error = ref<string | null>(null);

function deviceName(session: SessionView): string {
  return session.userAgent ?? t('devices.unknownDevice');
}

async function load(): Promise<void> {
  try {
    sessions.value = await controller.server().sessions();
    error.value = null;
  } catch (failure) {
    error.value = formErrors(failure, []).form;
  }
}

onMounted(load);

async function revoke(id: string): Promise<void> {
  try {
    await controller.server().revokeSession(id);
  } catch (failure) {
    error.value = formErrors(failure, []).form;
    return;
  }
  await load();
}
</script>
