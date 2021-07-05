import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { ListsStateInterface } from './state';

const getters: GetterTree<ListsStateInterface, StateInterface> = {
  lists (state) {
    return state.lists;
  },
};

export default getters;
