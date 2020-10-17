import api from '../../api'

// Initial State
const state = () => ({
  tags: [],
  noTagsCount: 0
})

// getters
const getters = {
  nextOrder(state) {
    if(state.tags.length < 1) return undefined;
    return (state.tags[state.tags.length - 1].order + 1);
  },
  noTagsCount(state) {
    // TODO: Set this using an api request on initial load
    return state.noTagsCount;
  },
  tags(state) {
    return state.tags;
  }
}

const actions = {
  async create({ commit, state, getters }, options) {
    return new Promise(
      (resolve, reject) => {
        options.order = getters.nextOrder;
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
            commit('removeTag', options.id);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  // TODO: Should this use await?
  async refresh({ commit, state, dispatch }) {
    dispatch('refreshTags');
    dispatch('refreshNoTagsCount');
  },
  async refreshTags({ commit, state }) {
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
  async refreshNoTagsCount({ commit, state }) {
    return new Promise(
      (resolve, reject) => {
        api.refreshNoTagsCount(
          (response) => {
            commit('setNoTagsCount', response.data);
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
    for(var tag of state.tags) {
      var current_order = state.tags.indexOf(tag);
      if(current_order != tag.order) {
        dispatch('update', {
          id: tag.id,
          order: current_order
        })
      }
    }
  },
  async update({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTag(
          options,
          (response) => {
            commit('updateTag', response.data);
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
  removeTag(state, id) {
    const index = state.tags.findIndex(
      (element) => { return (element.id == id) }
    );
    state.tags.splice(index, 1);
  },
  setTags(state, tags) {
    state.tags = tags;
  },
  setNoTagsCount(state, count) {
    state.noTagsCount = count;
  },
  updateTag(state, tag) {
    const index = state.tags.findIndex(
      (element) => { return (element.id == tag.id) }
    );
    state.tags.splice(index, 1, tag);
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
