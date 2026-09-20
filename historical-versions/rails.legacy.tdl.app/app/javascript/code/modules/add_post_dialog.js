import toastr from 'toastr'

const data = {
  addPostDialog: false,
  newPostTask: ''
}

const methods = {
  addPostrequisite(task) {
    this.$store.dispatch('tasks/addPostreq', {
      id: this.currentTask.id,
      post_task_id: task.id
    }).
    then(
      (response) => {
        // TODO: Directly add postreq
        this.currentPostreqs.push(response.data);
        this.refreshTasks();
        toastr.success('Added postrequisite!');
      },
      (error) => {
        toastr.error(error.message);
      }
    );
  },
  // TODO: Convert this into a single vuex action
  addPostTask() {
    this.$store.dispatch('tasks/create', {
      title: this.newPostTask,
      tags: this.currentTags.map(item => item.title),
      list: this.currentList
    }).
    then(
      (response) => {
        this.newPostTask = '';
        toastr.success('Added new task!');
        this.addPostrequisite({ id: response.data.id });
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
