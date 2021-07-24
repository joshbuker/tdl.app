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
  setTasks(state, tasks: Array) {
    state.tasks = tasks
  }
};

export default mutation;
