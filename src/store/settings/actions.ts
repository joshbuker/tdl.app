import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { SettingsStateInterface } from './state';
import { api } from 'boot/axios';

const actions: ActionTree<SettingsStateInterface, StateInterface> = {
  async fetchUsername({ commit, state, rootState }) {
    const token = `Bearer ${rootState.authentication.sessionToken}`
    const response = await api.get('/username', {
      headers: { Authorization: token },
      params: {}
    })
    commit('setUsername', response.data.username)
    return response
  }
};

export default actions;
