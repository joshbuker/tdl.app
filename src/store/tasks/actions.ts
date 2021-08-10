// @ts-nocheck
import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';
import { api } from 'boot/axios';
import Task from '../../models/task'

const actions: ActionTree<TasksStateInterface, StateInterface> = {
  async fetchTasks({ commit, getters, rootGetters }) {
    const response = await api.get('/tasks', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setTasks', response.data)
    this.$repo(Task).save(response.data)
    return response
  },
};

export default actions;
