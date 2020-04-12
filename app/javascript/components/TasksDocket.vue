<template>
  <div class="tasks-docket bg-light">
    <h3 class="text-center pt-2">{{ title }}</h3>
    <hr>
    <ul class="list-group">
      <li v-for="(task, index) in tasks" class="list-group-item list-group-item-action"
          :task='task' :index='index' :key='task.title'
          data-toggle='modal' data-target='#taskDetailModal'
          @click="showDetailModal(task)">
        {{ task.title }}
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
      this.$emit('clicked-show-detail', task)
    }
  }
};
</script>

<style>
.tasks-docket {
  border-radius: 10px;
}
</style>
