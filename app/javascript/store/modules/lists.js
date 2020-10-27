import api from '../../api'

// Initial State
const state = () => ({
  lists: []
})

// getters
const getters = {
  allTasksCount(state) {
    if(!state.lists) return 0;

    return state.lists.reduce(
      function(total, value) { return total + Number(value.task_count); },
      0
    );
  },
  lists(state) {
    return state.lists;
  },
  nextOrder(state) {
    if(state.lists.length < 1) return undefined;
    return (state.lists[state.lists.length - 1].order + 1);
  }
}

const actions = {
  async create({ commit, state, getters }, options) {
    return new Promise(
      (resolve, reject) => {
        options.order = getters.nextOrder;
        api.createList(
          options,
          (response) => {
            commit('addList', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async delete({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.deleteList(
          options,
          (response) => {
            // TODO: Remove list directly
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async refresh({ commit, state }) {
    return new Promise(
      (resolve, reject) => {
        api.refreshLists(
          (response) => {
            commit('setLists', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async syncOrdering({ commit, state, dispatch }, options) {
    for(var list of state.lists) {
      var current_order = state.lists.indexOf(list);
      if(current_order != list.order) {
        dispatch('update', {
          id: list.id,
          order: current_order
        })
      }
    }
  },
  async update({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateList(
          options,
          (response) => {
            commit('updateList', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  }
}

// mutations
const mutations = {
  addList(state, list) {
    state.lists.push(list);
  },
  incrementCount(state, list_title) {
    const index = state.lists.findIndex(
      (element) => { return (element.title == list_title) }
    );
    state.lists[index].task_count += 1;
  },
  setLists(state, lists) {
    state.lists = lists;
  },
  updateList(state, list) {
    const index = state.lists.findIndex(
      (element) => { return (element.id == list.id) }
    );
    state.lists.splice(index, 1, list);
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
