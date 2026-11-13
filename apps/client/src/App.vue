<template>
  <OtherTabPage v-if="state.kind === 'other-tab'" />
  <CouldntStartPage v-else-if="state.kind === 'failed'" :reason="state.reason" />
  <router-view v-else />
</template>

<script setup lang="ts">
import { useApp } from '@/composables/useApp.ts';
import CouldntStartPage from '@/pages/CouldntStartPage.vue';
import OtherTabPage from '@/pages/OtherTabPage.vue';

const { state } = useApp();
</script>
