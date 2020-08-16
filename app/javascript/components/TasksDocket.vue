<template>
  <div class="tasks-docket bg-light mb-2">
    <h3 class="text-center pt-2">{{ title }}</h3>
    <hr class="mb-0">
    <ul class="list-group overflow-auto" style="max-height: 75vh">
      <draggable :list="tasks" group="tasksdocket" @change="updateTaskOrder">
        <li v-for="(task, index) in tasks" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            :task='task' :index='index' :key='task.title'
            data-toggle='modal' data-target='#taskDetailModal'
            @click="showDetailModal(task)">
          {{ task.title }}
          <div><!-- Group tags together visually -->
            <span v-for='tag in task.tags' class="badge badge-secondary badge-pill ml-1 border border-dark" v-bind:style="{ 'background-color': tag.color, 'color': tag.text_color }">
              &nbsp;
            </span>
          </div>
        </li>
      </draggable>
    </ul>
    <p v-if="tasks.length == 0" class="text-center text-muted mt-3">
      <strong>Nothing yet!</strong>
    </p>
    <!-- find a way to create a modal per task and just toggle that modal
         directly rather than using a centralized "current task" variable? -->
    <div class="input-group p-2 border-top">
      <input type="text" placeholder="Click to add new task" class="form-control" v-model="quickNewTask" @keyup.enter="createQuickTask">
      <button class="btn btn-outline-primary badge-pill ml-1" @click="createQuickTask">
        <i class="fa fa-arrow-up"></i>
      </button>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable';

export default {
  props: {
    tasks: {
      required: true,
      type: Array
    },
    title: String
  },
  data: function() {
    return {
      quickNewTask: ''
    }
  },
  methods: {
    createQuickTask() {
      if (this.quickNewTask != '') {
        this.$emit('created-quick-task', this.title, this.quickNewTask);
        this.quickNewTask = '';
      };
    },
    showDetailModal(task) {
      this.$emit('clicked-show-detail', task);
    },
    updateTaskOrder(event) {
      console.log(event);
    }
  },
  components: {
    draggable
  }
};
</script>

<style>
.tasks-docket {
  border-radius: 10px;
}
</style>
