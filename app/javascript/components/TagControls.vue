<template>
  <ul class="list-group">
    <li v-for="tag in tags" class="list-group-item list-group-item-action" v-bind:style="{ 'background-color': tag.color, 'color': tag.text_color }">
      <span>
        {{ tag.title }}
      </span>
    </li>
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
