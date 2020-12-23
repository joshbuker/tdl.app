import toastr from 'toastr'

const data = {
  addPreDialog: false,
  newPreTask: ''
}

const methods = {
  addPrerequisite(task) {
    this.$store.dispatch('tasks/addPrereq', {
      id: this.currentTask.id,
      pre_task_id: task.id
    }).
    then(
      (response) => {
        // TODO: Directly add prereq
        this.currentPrereqs.push(response.data);
        this.refreshTasks();
        toastr.success('Added prerequisite!');
      },
      (error) => {
        toastr.error(error.message);
      }
    );
  },
  // TODO: Convert this into a single vuex action
  addPreTask() {
    this.$store.dispatch('tasks/create', {
      title: this.newPreTask,
      tags: this.currentTags.map(item => item.title),
      list: this.currentList
    }).
    then(
      (response) => {
        this.newPreTask = '';
        toastr.success('Added new task!');
        this.addPrerequisite({ id: response.data.id });
      },
      (error) => {
        toastr.error(error.message);
      }
    );
  }
}

export default {
  data,
  methods
}
