<template>
  <div class="tasks-docket bg-light">
    <h3 class="text-center pt-2">{{ title }}</h3>
    <hr>
    <ul class="list-group">
      <li v-for="task in tasks" class="list-group-item list-group-item-action" data-toggle='modal' data-target='#editTaskModal' @click="setCurrentTask(task)">
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
    setCurrentTask(task) {
      this.$emit('setCurrentTask', task)
    }
  }
};
</script>

<style>
.tasks-docket {
  border-radius: 10px;
}
</style>
