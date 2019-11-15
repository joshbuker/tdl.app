<template>
  <ul>
    <li>All Tasks</li>
    <li v-for="list in lists">
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
