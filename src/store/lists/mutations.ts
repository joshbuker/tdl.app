import { MutationTree } from 'vuex';
import { ListsStateInterface } from './state';

const mutation: MutationTree<ListsStateInterface> = {
  addList(state, list: List) {
    state.lists.push(list)
    // Sort via order first, then alphabetically
    state.lists = state.lists.sort((a, b) => {
      if (a.order < b.order) {
        return -1
      } else if (a.order > b.order) {
        return 1
      } else {
        // TODO: Pass in user locale to this?
        return a.title.localeCompare(b.title)
      }
    })
  },

  setLists(state, lists: Array) {
    state.lists = lists
  },

  updateList(state, list: List) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == list.id) }
    )
    state.lists.splice(index, 1, list)
  },

  removeList(state, id: Integer) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == id) }
    )
    state.lists.splice(index, 1)
  }
};

export default mutation;
