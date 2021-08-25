import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { SettingsStateInterface } from './state';

const getters: GetterTree<SettingsStateInterface, StateInterface> = {
  username (state) {
    return state.username;
  },

  selectedList (state) {
    return state.selectedList;
  },

  selectedTags (state) {
    return state.selectedTags;
  }
};

export default getters;
