<template>
  <ul class="list-group">
    <li v-for="tag in tags" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" v-bind:style="{ 'background-color': tag.color, 'color': tag.text_color }" @click='limitByTag(tag)'>
      <span>
        {{ tag.title }}
      </span>
      <div>
        <span class="badge badge-secondary badge-pill">{{ tag.task_count }}</span>
        <span class="badge badge-danger badge-pill" @click.stop='deleteTag(tag)'>x</span>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  props: {
    tags: Array
  },
  methods: {
    limitByTag(tag) {
      this.$emit('clicked-tag', tag);
    },
    deleteTag(tag) {
      this.$emit('clicked-delete-tag', tag);
    }
  }
};
</script>

<style>
</style>
