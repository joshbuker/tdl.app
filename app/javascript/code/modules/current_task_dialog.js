import toastr from 'toastr'
import api from '../../api'

const data = {
  currentTaskDialog: false,
  editNotes: '',
  editRemindMe: false,
  editReviewAt: '',
  editTaskTitle: '',
  //
  // AJAX variables (TODO: convert to Vuex store)
  //
  currentTask: {},
  currentTags: [],
  currentPrereqs: [],
  currentPostreqs: [],
  currentList: ''
}

const methods = {
  setCurrentTask(task) {
    this.currentTask = task;
    this.currentTags = task.tags;
    this.currentList = task.list_title;
    this.editTaskTitle = task.title;
    this.editRemindMe = task.remind_me;
    this.editReviewAt = task.review_at;
    this.newTask = '';
    this.createTaskDialog = false;
    api.fetchPostreqs(
      { id: task.id },
      (response) => {
        this.currentPostreqs = response.data;
      },
      (error) => {
        toastr.error(error.message);
      }
    );
    api.fetchPrereqs(
      { id: task.id },
      (response) => {
        this.currentPrereqs = response.data;
      },
      (error) => {
        toastr.error(error.message);
      }
    );
    this.currentTaskDialog = true;
  },
  markTaskComplete(task) {
    this.currentTaskDialog = false;
    this.$store.dispatch('tasks/markComplete', { id: task.id }).
    then(
      (response) => {
        this.currentTask = {};
        toastr.success('Completed task!');
        this.refreshTasks();
      },
      (error) => {
        this.currentTaskDialog = true;
        toastr.error(error.message);
      }
    );
  },
  markTaskIncomplete(task) {
    this.currentTaskDialog = false;
    this.$store.dispatch('tasks/markIncomplete', { id: task.id }).
    then(
      (response) => {
        this.currentTask = {};
        toastr.success('Uncompleted task!');
        this.refreshTasks();
      },
      (error) => {
        this.currentTaskDialog = true;
        toastr.error(error.message);
      }
    );
  },
  removePostrequisite(task) {
    if(confirm('Are you sure?')) {
      this.$store.dispatch('tasks/removePostreq', {
        id: this.currentTask.id,
        post_task_id: task.id
      }).
      then(
        (response) => {
          // TODO: Directly remove postreq
          this.refreshTasks();
          this.currentPostreqs = response.data;
          toastr.success('Removed postrequisite!');
        },
        (error) => {
          toastr.error(error.message);
        }
      );
    }
  },
  removePrerequisite(task) {
    if(confirm('Are you sure?')) {
      this.$store.dispatch('tasks/removePrereq', {
        id: this.currentTask.id,
        pre_task_id: task.id
      }).
      then(
        (response) => {
          // TODO: Directly remove prereq
          this.refreshTasks();
          this.currentPrereqs = response.data;
          toastr.success('Removed prerequisite!');
        },
        (error) => {
          toastr.error(error.message);
        }
      );
    }
  },
}

export default {
  data,
  methods
}
