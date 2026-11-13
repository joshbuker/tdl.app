<template>
  <section :aria-label="$t('task.history')">
    <h2 class="text-h6">{{ $t('task.history') }}</h2>
    <q-list dense>
      <q-item v-for="row in rows" :key="row.entry.opId">
        <q-item-section>
          <q-item-label>{{ describe(row.entry) }}</q-item-label>
          <q-item-label caption>
            {{
              $t('history.madeBy', {
                who: row.mine ? $t('history.byYou') : $t('history.byOther'),
                when: row.at.toLocaleString(locale),
              })
            }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </section>
</template>

<script setup lang="ts">
import type { HistoryEntry } from '@tdl/sync';
import { useI18n } from 'vue-i18n';
import type { HistoryRow } from '@/display/task-display.ts';

defineProps<{ rows: HistoryRow[] }>();
const { t, locale } = useI18n();

/** What a history entry changed, in words. */
function describe({ change, recordType }: HistoryEntry): string {
  if ('kind' in change) {
    switch (change.kind) {
      case 'createTask':
        return t('history.createTask');
      case 'moveTask':
        return t('history.moveTask');
      case 'createLink':
        return t('history.createLink');
      case 'removeLink':
        return t('history.removeLink');
      default:
        return t('history.other');
    }
  }
  if (recordType === 'link') return t('history.linkChanged');
  switch (change.field) {
    case 'title':
      return t('history.title', { title: typeof change.value === 'string' ? change.value : '' });
    case 'notes':
      return t('history.notes');
    case 'completedAt':
      return change.value === null ? t('history.uncompleted') : t('history.completed');
    default:
      return t('history.other');
  }
}
</script>
