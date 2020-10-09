import api from '../../api'

// Initial State
const state = () => ({
  today: [],
  tomorrow: [],
  upcoming: [],
  someday: [],
  treeview: [],
  search: []
})

// getters
const getters = {
  today(state) {
    return state.today;
  },
  tomorrow(state) {
    return state.tomorrow;
  },
  upcoming(state) {
    return state.upcoming;
  },
  someday(state) {
    return state.someday;
  },
  // TODO: Consolidate naming for treeTasks/treeview
  treeTasks(state) {
    return state.treeview;
  },
  search(state) {
    return state.search;
  }
}

const actions = {
  async addPostreq({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.addPostreq(
          options,
          (response) => {
            // TODO: Add task directly
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async addPrereq({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.addPrereq(
          options,
          (response) => {
            // TODO: Add task directly
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async clearCompleted({ commit, state }) {
    return new Promise(
      (resolve, reject) => {
        api.clearCompleted(
          (response) => {
            // TODO: Directly remove completed tasks? May not be worth trying.
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async create({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.createTask(
          options,
          (response) => {
            // TODO: Add task directly
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
        api.deleteTask(
          options,
          (response) => {
            // TODO: Remove task directly
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async markComplete({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.markTaskComplete(
          options,
          (response) => {
            // TODO: Update task directly
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async markIncomplete({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.markTaskIncomplete(
          options,
          (response) => {
            // TODO: Update task directly
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
  async refresh({ commit, state, dispatch }, options) {
    dispatch('refreshToday', options);
    dispatch('refreshTomorrow', options);
    dispatch('refreshUpcoming', options);
    dispatch('refreshSomeday', options);
    dispatch('refreshTreeview', options);
  },
  async refreshToday({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.refreshToday(
          options,
          (response) => {
            commit('setToday', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async refreshTomorrow({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.refreshTomorrow(
          options,
          (response) => {
            commit('setTomorrow', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async refreshUpcoming({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.refreshUpcoming(
          options,
          (response) => {
            commit('setUpcoming', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async refreshSomeday({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.refreshSomeday(
          options,
          (response) => {
            commit('setSomeday', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async refreshTreeview({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.refreshTreeview(
          options,
          (response) => {
            commit('setTreeview', response.data);
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async removePostreq({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.removePostreq(
          options,
          (response) => {
            // TODO: Directly remove postreq
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async removePrereq({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.removePrereq(
          options,
          (response) => {
            // TODO: Directly remove prereq
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateList({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskList(
          options,
          (response) => {
            // TODO: Directly update task/lists
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateNotes({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskNotes(
          options,
          (response) => {
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateReviewAt({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskReviewAt(
          options,
          (response) => {
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateTags({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskTags(
          options,
          (response) => {
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async updateTitle({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskTitle(
          options,
          (response) => {
            resolve(response);
          },
          (error) => {
            reject(error);
          }
        )
      }
    );
  },
  async search({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.search(
          options,
          (response) => {
            commit('setSearch', response.data);
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
  setToday(state, tasks) {
    state.today = tasks;
  },
  setTomorrow(state, tasks) {
    state.tomorrow = tasks;
  },
  setUpcoming(state, tasks) {
    state.upcoming = tasks;
  },
  setSomeday(state, tasks) {
    state.someday = tasks;
  },
  setTreeview(state, tasks) {
    state.treeview = tasks;
  },
  setSearch(state, tasks) {
    state.search = tasks;
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
