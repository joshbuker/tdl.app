import { MutationTree } from 'vuex';
import { ListsStateInterface } from './state';

const mutation: MutationTree<ListsStateInterface> = {
  setLists(state, lists: array) {
    state.lists = lists
  }
};

export default mutation;
