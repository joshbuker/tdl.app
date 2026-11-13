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
        <q-btn-dropdown v-if="ready !== null" flat no-caps :label="ready.me.username">
          <q-list>
            <!-- Logging out is wired in Task 16. -->
            <q-item v-close-popup clickable>
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
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApp } from '@/composables/useApp.ts';
import { listRows } from '@/display/task-display.ts';
import { errorKey } from '@/forms/account-forms.ts';

const { state } = useApp();
const router = useRouter();

// `state` is triggered in place when the replica changes, so the computeds below read it directly:
// one returning the same state object wouldn't pass the change on.
const ready = computed(() => (state.value.kind === 'ready' ? state.value : null));
const lists = computed(() =>
  state.value.kind === 'ready' ? listRows(state.value.replica.state()) : [],
);

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
