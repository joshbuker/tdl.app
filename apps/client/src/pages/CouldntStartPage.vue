<template>
  <div class="fullscreen flex flex-center q-pa-md">
    <div role="alert" class="column items-center q-gutter-md text-center" style="max-width: 32rem">
      <h1 class="text-h5">{{ $t('couldntStart.title') }}</h1>
      <p>{{ $t('couldntStart.message') }}</p>
      <p class="text-caption">{{ $t('couldntStart.reason', { reason }) }}</p>
      <q-btn color="primary" :label="$t('couldntStart.reload')" @click="reload" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ reason: string }>();

function reload(): void {
  location.reload();
}
</script>
