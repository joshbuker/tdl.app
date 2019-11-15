<template>
  <ul>
    <li v-for="tag in tags">
      <span v-bind:style="{ color: tag.color }">
        {{ tag.title }}
      </span>
    </li>
    <li><span style="color: white;">No Tags</span></li>
  </ul>
</template>

<script>
export default {
  props: {
    tags: Array
  }
};
</script>

<style>
</style>
