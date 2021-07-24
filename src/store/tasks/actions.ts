import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';
import { api } from 'boot/axios';

const actions: ActionTree<TasksStateInterface, StateInterface> = {
  async fetchTasks({ commit, rootGetters }) {
    const response = await api.get('/tasks', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setTasks', response.data)
    return response
  },
};

export default actions;
