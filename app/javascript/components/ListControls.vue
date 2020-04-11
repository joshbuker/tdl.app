<template>
  <ul class="nav flex-column">
    <li v-for="list in lists" class="nav-item">
      {{ list.title }}
    </li>
  </ul>
</template>

<script>
export default {
  props: {
    lists: Array
  }
};
</script>

<style>
</style>
