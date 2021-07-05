import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { ListsStateInterface } from './state';
import { api } from 'boot/axios';

const actions: ActionTree<ListsStateInterface, StateInterface> = {
  async fetchLists({ commit, rootGetters }) {
    const response = await api.get('/lists', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setLists', response.data)
    return response
  }
};

export default actions;
