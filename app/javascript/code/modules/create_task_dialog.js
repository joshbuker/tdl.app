import toastr from 'toastr'

const data = {
  newTask: '',
  createTaskDialog: false,
  createTaskTags: [],
  createTaskList: null,
  createTaskReviewAt: '',
  createTaskRemindMe: false
}

const methods = {
  addTask() {
    this.$store.dispatch('tasks/create', {
      title: this.newTask,
      list: this.createTaskList,
      tags: this.createTaskTags,
      remind_me: this.createTaskRemindMe,
      review_at: this.createTaskReviewAt
    }).
    then(
      (response) => {
        this.newTask = '';
        toastr.success('Added new task!');
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
