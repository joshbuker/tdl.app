<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(open: boolean) => emit('update:modelValue', open)"
  >
    <q-card style="min-width: 320px">
      <q-form @submit="submit">
        <q-card-section>
          <div class="text-h6">{{ $t('addLink.title') }}</div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="picked"
            :options="shown"
            :label="$t('addLink.task')"
            :no-option-label="$t('addLink.noOptions')"
            use-input
            hide-selected
            fill-input
            emit-value
            map-options
            input-debounce="0"
            @filter="filter"
          />
          <div v-if="error !== null" role="alert" class="text-negative q-mt-sm">
            {{ $t(error) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="$t('addLink.cancel')" />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('addLink.add')"
            :disable="picked === null"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TaskOption } from '@/display/task-display.ts';

const props = defineProps<{
  modelValue: boolean;
  /** The tasks matching a search. */
  options: (search: string) => TaskOption[];
  /** Translation key of why the last pick was refused, if it was. */
  error: string | null;
}>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; pick: [taskId: string] }>();

const picked = ref<string | null>(null);
const shown = ref<TaskOption[]>([]);

watch(
  () => props.modelValue,
  (open) => {
    if (open) picked.value = null;
  },
);

function filter(search: string, update: (callback: () => void) => void): void {
  update(() => {
    shown.value = props.options(search);
  });
}

function submit(): void {
  if (picked.value !== null) emit('pick', picked.value);
}
</script>
