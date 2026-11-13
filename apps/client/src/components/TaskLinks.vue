<template>
  <section :aria-label="heading">
    <h2 class="text-h6">{{ heading }}</h2>
    <q-list v-if="links.length > 0" dense>
      <q-item v-for="link in links" :key="link.linkId">
        <q-item-section>
          <q-item-label>
            <router-link :to="`/tasks/${link.taskId}`">{{ link.title }}</router-link>
          </q-item-label>
        </q-item-section>
        <q-item-section v-if="link.inLoop" side>
          <q-badge color="negative" :label="$t('task.inLoop')" />
        </q-item-section>
        <q-item-section v-if="link.redundant" side>
          <q-badge color="warning" text-color="dark" :label="$t('task.redundant')" />
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="close"
            :aria-label="$t('task.removeLink', { title: link.title })"
            @click="emit('remove', link.linkId)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <p v-else class="text-grey">{{ $t('task.noLinks') }}</p>
  </section>
</template>

<script setup lang="ts">
import type { LinkRow } from '@/display/task-display.ts';

defineProps<{ heading: string; links: LinkRow[] }>();
const emit = defineEmits<{ remove: [linkId: string] }>();
</script>
