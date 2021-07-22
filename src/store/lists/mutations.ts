import { MutationTree } from 'vuex';
import { ListsStateInterface } from './state';

function sortLists(state) {
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
}

const mutation: MutationTree<ListsStateInterface> = {
  addList(state, list: List) {
    state.lists.push(list)
    // Rather than trying to insert it in the right spot, just add it to the end
    // and resort. Maybe change later?
    sortLists(state)
  },

  setLists(state, lists: Array) {
    state.lists = lists
  },

  updateList(state, list: List) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == list.id) }
    )
    state.lists.splice(index, 1, list)
    // Resort because title change might affect ordering
    sortLists(state)
  },

  removeList(state, id: Integer) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == id) }
    )
    state.lists.splice(index, 1)
  }
};

export default mutation;
