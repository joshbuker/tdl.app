<template>
  <q-page padding>
    <template v-if="list !== null">
      <div class="row items-center q-gutter-sm">
        <h1 class="text-h5">{{ list.title }}</h1>
        <q-btn
          v-if="controls.share"
          flat
          no-caps
          icon="share"
          :label="$t('list.share')"
          @click="sharing = true"
        />
      </div>
      <q-form v-if="controls.addTasks" @submit="addTask">
        <q-input
          v-model="newTask"
          :label="$t('list.newTask')"
          :error="newTaskError !== null"
          :error-message="newTaskError === null ? undefined : $t(newTaskError)"
        />
      </q-form>
      <div v-if="error !== null" role="alert" class="text-negative">{{ $t(error) }}</div>
      <q-list separator>
        <q-item v-for="task in tasks" :key="task.id">
          <q-item-section v-if="editable.has(task.id)" side>
            <q-checkbox
              :model-value="task.completed"
              :aria-label="$t('list.complete', { title: task.title })"
              @update:model-value="(done: boolean) => setCompleted(task.id, done)"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              <router-link
                :to="`/tasks/${task.id}`"
                :class="task.completed ? 'text-strike text-grey' : undefined"
              >
                {{ task.title }}
              </router-link>
            </q-item-label>
          </q-item-section>
          <q-item-section v-if="task.nextUp" side>
            <q-badge color="positive" :label="$t('list.nextUp')" />
          </q-item-section>
        </q-item>
      </q-list>
      <ShareDialog v-model="sharing" :target="{ kind: 'list', id: listId }" @left="goHome" />
    </template>
    <div v-else-if="content === 'not-found'" role="alert">{{ $t('errors.not-found') }}</div>
    <div v-else class="flex flex-center q-pa-lg">
      <q-spinner size="lg" color="primary" role="progressbar" :aria-label="$t('page.loading')" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ShareDialog from '@/components/ShareDialog.vue';
import { useApp, useDevice } from '@/composables/useApp.ts';
import { canEditTask, listControls } from '@/display/sharing-display.ts';
import { pageContent } from '@/display/sync-display.ts';
import { taskRows } from '@/display/task-display.ts';
import { errorKey } from '@/forms/account-forms.ts';

const props = defineProps<{ listId: string }>();
const { state } = useApp();

const replica = computed(() => (state.value.kind === 'ready' ? state.value.replica : null));
const device = useDevice();
const list = computed(() => device.value?.lists.get(props.listId) ?? null);
const content = computed(() =>
  state.value.kind === 'ready' && device.value !== null
    ? pageContent(list.value !== null, device.value, state.value.me.defaultListId)
    : 'loading',
);
const tasks = computed(() => (device.value === null ? [] : taskRows(device.value, props.listId)));

// What the user's role lets them do here.
const controls = computed(() =>
  state.value.kind === 'ready' && device.value !== null
    ? listControls(device.value, state.value.me.userId, props.listId)
    : { addTasks: false, share: false },
);
const editable = computed(() => {
  const current = device.value;
  if (state.value.kind !== 'ready' || current === null) return new Set<string>();
  const { userId } = state.value.me;
  return new Set(
    tasks.value.filter((task) => canEditTask(current, userId, task.id)).map((t) => t.id),
  );
});

const router = useRouter();
const sharing = ref(false);

/** After leaving the list, it is gone from the device: go to the user's own tasks. */
async function goHome(): Promise<void> {
  await router.push('/');
}

const newTask = ref('');
const newTaskError = ref<string | null>(null);
const error = ref<string | null>(null);

async function addTask(): Promise<void> {
  if (replica.value === null) return;
  const title = newTask.value;
  const result = await replica.value.createTask(props.listId, title);
  if (!result.ok) {
    newTaskError.value = errorKey(result.errors[0]?.code ?? 'unknown');
    return;
  }
  newTaskError.value = null;
  // Keep anything typed while the task was being added.
  if (newTask.value === title) newTask.value = '';
}

async function setCompleted(taskId: string, done: boolean): Promise<void> {
  if (replica.value === null) return;
  const completedAt = done ? new Date().toISOString() : null;
  const result = await replica.value.setTaskField(taskId, 'completedAt', completedAt);
  error.value = result.ok ? null : errorKey(result.errors[0]?.code ?? 'unknown');
}
</script>
