<template>
  <div v-if="state.kind === 'other-tab'" class="q-pa-md">{{ $t('otherTab.message') }}</div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { useApp } from '@/composables/useApp.ts';

const { state } = useApp();
</script>
