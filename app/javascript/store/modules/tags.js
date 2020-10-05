import api from '../../api'

// Initial State
const state = () => ({
  tags: []
})

// getters
const getters = {
  tags(state) {
    return state.tags;
  }
}

const actions = {
  async create({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.createTag(
          options,
          (response) => {
            commit('addTag', response.data);
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
        api.deleteTag(
          options,
          (response) => {
            // TODO: Remove tag directly
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
        api.refreshTags(
          (response) => {
            commit('setTags', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async update({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTag(
          options,
          (response) => {
            // TODO: Update tag directly
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
  addTag(state, tag) {
    state.tags.push(tag);
  },
  setTags(state, tags) {
    state.tags = tags;
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
