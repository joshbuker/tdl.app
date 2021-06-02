import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { SettingsStateInterface } from './state';

const getters: GetterTree<SettingsStateInterface, StateInterface> = {
  sessionToken (state) {
    return state.sessionToken;
  }
};

export default getters;
