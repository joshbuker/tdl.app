<template>
  <q-page padding>
    <div v-if="task !== null" class="q-gutter-md">
      <q-form @submit="saveTitle">
        <q-input
          v-model="title"
          :label="$t('task.title')"
          :error="titleError !== null"
          :error-message="titleError === null ? undefined : $t(titleError)"
          @blur="saveTitle"
        />
      </q-form>
      <q-checkbox
        :model-value="task.completedAt !== null"
        :label="$t('task.completed')"
        @update:model-value="setCompleted"
      />
      <q-input
        v-model="notes"
        type="textarea"
        autogrow
        :debounce="1000"
        :label="$t('task.notes')"
        :error="notesError !== null"
        :error-message="notesError === null ? undefined : $t(notesError)"
        @update:model-value="saveNotes"
      />
      <div v-if="error !== null" role="alert" class="text-negative">{{ $t(error) }}</div>

      <TaskLinks
        :heading="$t('task.prerequisites')"
        :links="links.prerequisites"
        @remove="removeLink"
      />
      <q-btn outline color="primary" :label="$t('task.addPrerequisite')" @click="openAddLink" />
      <TaskLinks
        :heading="$t('task.postrequisites')"
        :links="links.postrequisites"
        @remove="removeLink"
      />
      <TaskHistory :rows="history" />

      <AddLinkDialog
        v-model="addingLink"
        :options="options"
        :error="addLinkError"
        @pick="addPrerequisite"
      />
    </div>
    <div v-else role="alert">{{ $t('errors.not-found') }}</div>
  </q-page>
</template>

<script setup lang="ts">
import type { Validated } from '@tdl/domain';
import { computed, ref, watch } from 'vue';
import AddLinkDialog from '@/components/AddLinkDialog.vue';
import TaskHistory from '@/components/TaskHistory.vue';
import TaskLinks from '@/components/TaskLinks.vue';
import { useApp } from '@/composables/useApp.ts';
import { historyRows, taskLinks, taskOptions, type TaskOption } from '@/display/task-display.ts';
import { errorKey } from '@/forms/account-forms.ts';

const props = defineProps<{ taskId: string }>();
const { state } = useApp();

const ready = computed(() => (state.value.kind === 'ready' ? state.value : null));
// `state` is triggered in place when the replica changes, so these read it directly: going
// through `ready`, which stays the same object, wouldn't pass the change on.
const device = computed(() => (state.value.kind === 'ready' ? state.value.replica.state() : null));
const task = computed(() => device.value?.tasks.get(props.taskId) ?? null);
const links = computed(() =>
  device.value === null
    ? { prerequisites: [], postrequisites: [] }
    : taskLinks(device.value, props.taskId),
);
const history = computed(() =>
  state.value.kind === 'ready'
    ? historyRows(state.value.replica.history(props.taskId), state.value.me.userId)
    : [],
);

// The fields show what the user types; they follow the task when it changes elsewhere.
const title = ref('');
const notes = ref('');
const titleError = ref<string | null>(null);
const notesError = ref<string | null>(null);
const error = ref<string | null>(null);
watch(
  () => task.value?.title,
  (value) => {
    title.value = value ?? '';
    titleError.value = null;
  },
  { immediate: true },
);
watch(
  () => task.value?.notes,
  (value) => {
    notes.value = value ?? '';
  },
  { immediate: true },
);

/** The translation key of a failed edit's first error, or null if it succeeded. */
function failure(result: Validated<unknown>): string | null {
  return result.ok ? null : errorKey(result.errors[0]?.code ?? 'unknown');
}

async function saveTitle(): Promise<void> {
  if (ready.value === null || title.value === task.value?.title) return;
  titleError.value = failure(
    await ready.value.replica.setTaskField(props.taskId, 'title', title.value),
  );
}

async function saveNotes(): Promise<void> {
  if (ready.value === null || notes.value === task.value?.notes) return;
  notesError.value = failure(
    await ready.value.replica.setTaskField(props.taskId, 'notes', notes.value),
  );
}

async function setCompleted(done: boolean): Promise<void> {
  if (ready.value === null) return;
  const completedAt = done ? new Date().toISOString() : null;
  error.value = failure(
    await ready.value.replica.setTaskField(props.taskId, 'completedAt', completedAt),
  );
}

async function removeLink(linkId: string): Promise<void> {
  if (ready.value === null) return;
  error.value = failure(await ready.value.replica.removeLink(linkId));
}

const addingLink = ref(false);
const addLinkError = ref<string | null>(null);

function openAddLink(): void {
  addLinkError.value = null;
  addingLink.value = true;
}

function options(search: string): TaskOption[] {
  return device.value === null ? [] : taskOptions(device.value, props.taskId, search);
}

async function addPrerequisite(prerequisiteId: string): Promise<void> {
  if (ready.value === null) return;
  const result = await ready.value.replica.addLink(prerequisiteId, props.taskId);
  if (!result.ok) {
    addLinkError.value = errorKey(result.rejection.code);
    return;
  }
  addingLink.value = false;
}
</script>
