import { MutationTree } from 'vuex';
import { TasksStateInterface } from './state';

function sortTasks(state) {
  // Sort via order first, then alphabetically
  state.tasks = state.tasks.sort((a, b) => {
    if (a.order < b.order) {
      return -1
    } else if (a.order > b.order) {
      return 1
    } else {
      // TODO: Pass in user locale to this?
      return a.title.localeCompare(b.title)
    }
  })
}

const mutation: MutationTree<TasksStateInterface> = {
  addTask(state, task: Task) {
    state.tasks.push(task)
    // Rather than trying to insert it in the right spot, just add it to the end
    // and resort. Maybe change later?
    sortTasks(state)
  },

  setTasks(state, tasks: Array) {
    state.tasks = tasks
  },

  updateTasks(state, tasks: Array) {
    for (const task of tasks) {
      const index = state.tasks.findIndex(
        (element) => { return (element.id == task.id) }
      )
      state.tasks.splice(index, 1, task)
    }
    // Resort because title change might affect ordering
    sortTasks(state)
  },

  updateTask(state, task: Task) {
    const index = state.tasks.findIndex(
      (element) => { return (element.id == task.id) }
    )
    state.tasks.splice(index, 1, task)
    // Resort because title change might affect ordering
    sortTasks(state)
  },

  removeTask(state, id: Integer) {
    const index = state.tasks.findIndex(
      (element) => { return (element.id == id) }
    )
    state.tasks.splice(index, 1)
  }
};

export default mutation;
