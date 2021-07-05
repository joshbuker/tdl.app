import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { SettingsStateInterface } from './state';
import { api } from 'boot/axios';

const actions: ActionTree<SettingsStateInterface, StateInterface> = {
  async fetchUsername({ commit, rootGetters }) {
    const response = await api.get('/username', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setUsername', response.data.username)
    return response
  }
};

export default actions;
