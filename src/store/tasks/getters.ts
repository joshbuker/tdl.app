import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';

const getters: GetterTree<TasksStateInterface, StateInterface> = {
  tasks (state) {
    return state.tasks;
  },

  allTasksCount (state) {
    return state.tasks.length;
  }
};

export default getters;
