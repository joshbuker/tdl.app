<template>
  <ul class="list-group">
    <li v-for="list in lists" class="list-group-item list-group-item-action">
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
