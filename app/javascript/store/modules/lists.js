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
  }
}

const actions = {
  async create({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
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
  }
}

// mutations
const mutations = {
  addList(state, list) {
    state.lists.push(list);
  },
  setLists(state, lists) {
    state.lists = lists;
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
