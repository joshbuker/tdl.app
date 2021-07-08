import { MutationTree } from 'vuex';
import { ListsStateInterface } from './state';

const mutation: MutationTree<ListsStateInterface> = {
  setLists(state, lists: array) {
    state.lists = lists
  },

  updateList(state, list: List) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == list.id) }
    );
    state.lists.splice(index, 1, list);
  }
};

export default mutation;
