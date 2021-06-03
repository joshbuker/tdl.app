<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App',
  preFetch() {
    console.log('On app load?')
  }
})
</script>
