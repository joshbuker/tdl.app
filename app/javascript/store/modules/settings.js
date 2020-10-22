import api from '../../api'

// Initial State
const state = () => ({
  timezone: ''
})

// getters
const getters = {
  timezone(state) {
    return state.timezone;
  }
}

const actions = {
  async fetchTimezone({ commit, state }) {
    return new Promise(
      (resolve, reject) => {
        api.fetchTimezone(
          (response) => {
            commit('setTimezone', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateTimezone({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTimezone(
          options,
          (response) => {
            commit('setTimezone', response.data);
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
  setTimezone(state, timezone) {
    state.timezone = timezone;
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
