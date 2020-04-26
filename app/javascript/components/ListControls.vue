<template>
  <ul class="list-group">
    <li v-for="list in lists" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
      {{ list.title }}
      <span class="badge badge-secondary badge-pill">{{ list.task_count }}</span>
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
