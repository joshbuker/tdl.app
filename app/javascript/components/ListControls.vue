<template>
  <ul class="list-group">
    <li v-for="list in lists"
      class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
      @click='limitByList(list)'
      v-bind:class="selectedList == list.title ? 'active' : ''">
      {{ list.title }}
      <span class="badge badge-secondary badge-pill">{{ list.task_count }}</span>
    </li>
  </ul>
</template>

<script>
export default {
  data: function() {
    return {
      selectedList: 'All Tasks'
    }
  },
  props: {
    lists: Array
  },
  methods: {
    limitByList(list) {
      this.$emit('clicked-list', list);
      this.selectedList = list.title;
    }
  }
};
</script>

<style>
</style>
