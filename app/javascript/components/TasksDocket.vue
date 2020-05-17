<template>
  <div class="tasks-docket bg-light">
    <h3 class="text-center pt-2">{{ title }}</h3>
    <hr>
    <ul class="list-group overflow-auto" style="max-height: 75vh">
      <li v-for="(task, index) in tasks" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
          :task='task' :index='index' :key='task.title'
          data-toggle='modal' data-target='#taskDetailModal'
          @click="showDetailModal(task)">
        {{ task.title }}
        <span>
          <span v-for='tag in task.tags' class="badge badge-secondary badge-pill ml-1 border border-dark" v-bind:style="{ 'background-color': tag.color, 'color': tag.text_color }">&nbsp;</span>
        </span>
      </li>
    </ul>
    <!-- find a way to create a modal per task and just toggle that modal
         directly rather than using a centralized "current task" variable? -->
  </div>
</template>

<script>
export default {
  props: {
    tasks: Array,
    title: String
  },
  methods: {
    showDetailModal(task) {
      this.$emit('clicked-show-detail', task);
    }
  }
};
</script>

<style>
.tasks-docket {
  border-radius: 10px;
}
</style>
