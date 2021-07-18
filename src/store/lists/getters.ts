import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { ListsStateInterface } from './state';

const getters: GetterTree<ListsStateInterface, StateInterface> = {
  lists (state) {
    return state.lists;
  },
  nextOrder (state) {
    if (state.lists.length < 1) return undefined;
    return (state.lists[state.lists.length - 1].order + 1);
  }
};

export default getters;
