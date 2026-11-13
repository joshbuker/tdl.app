<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          v-if="ready !== null"
          flat
          round
          dense
          icon="menu"
          :aria-label="$t('layout.menu')"
          @click="drawerOpen = !drawerOpen"
        />
        <q-toolbar-title>{{ $t('app.name') }}</q-toolbar-title>
        <SyncStatus class="q-mr-md" />
        <q-btn-dropdown v-if="ready !== null" flat no-caps :label="ready.me.username">
          <q-list>
            <q-item v-close-popup clickable role="menuitem" @click="startLogOut">
              <q-item-section>{{ $t('layout.logOut') }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-if="ready !== null" v-model="drawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>{{ $t('layout.lists') }}</q-item-label>
        <q-item v-for="list in lists" :key="list.id" :to="`/lists/${list.id}`">
          <q-item-section>{{ list.title }}</q-item-section>
        </q-item>
      </q-list>
      <q-form class="q-px-md" @submit="createList">
        <q-input
          v-model="newList"
          dense
          :label="$t('layout.newList')"
          :error="newListError !== null"
          :error-message="newListError === null ? undefined : $t(newListError)"
        />
      </q-form>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <SessionEndedDialog :model-value="showSessionEnded(state, warning)" @log-out="startLogOut" />
    <LogOutDialog :warning="warning" @close="warning = null" @discard="discard" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import LogOutDialog from '@/components/LogOutDialog.vue';
import SessionEndedDialog from '@/components/SessionEndedDialog.vue';
import SyncStatus from '@/components/SyncStatus.vue';
import { useApp, useDevice } from '@/composables/useApp.ts';
import { listRows } from '@/display/task-display.ts';
import { errorKey } from '@/forms/account-forms.ts';
import { logOut, showSessionEnded, type UnsyncedWarning } from '@/forms/log-out.ts';

const { state, controller } = useApp();
const router = useRouter();

const ready = computed(() => (state.value.kind === 'ready' ? state.value : null));
const device = useDevice();
const lists = computed(() => (device.value === null ? [] : listRows(device.value)));

// Logging out: with unsynced changes, a warning shows first (see forms/log-out.ts). Once logged
// out, the app moves to the login page (followState, in boot/app.ts).
const warning = ref<UnsyncedWarning | null>(null);

async function startLogOut(): Promise<void> {
  warning.value = await logOut(controller);
}

async function discard(): Promise<void> {
  warning.value = await logOut(controller, 'discard');
}

const drawerOpen = ref(false);
const newList = ref('');
const newListError = ref<string | null>(null);

async function createList(): Promise<void> {
  if (ready.value === null) return;
  const title = newList.value;
  const result = await ready.value.replica.createList(title);
  if (!result.ok) {
    newListError.value = errorKey(result.errors[0]?.code ?? 'unknown');
    return;
  }
  if (newList.value === title) newList.value = '';
  newListError.value = null;
  await router.push(`/lists/${result.value}`);
}
</script>
