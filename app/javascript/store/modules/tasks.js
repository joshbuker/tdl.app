import api from '../../api'
import { DateTime } from 'luxon'

// Initial State
const state = () => ({
  // New stuff
  tasks: [],
  treeview: [],
  // Obsolete
  search: []
})

// getters
const getters = {
  nextOrder(state, getters) {
    if(getters.today('All Tasks', []).length < 1) return undefined;
    return (getters.today('All Tasks', [])[getters.today('All Tasks', []).length - 1].order + 1);
  },
  list_tasks: (state) => (list) => {
    if(list == 'All Tasks' || list == null) {
      return state.tasks;
    } else {
      return state.tasks.filter(
        (task) => { return (
          task.list_title == list
        )}
      );
    }
  },
  tasks: (state, getters) => (list, tags) => {
    if(tags === [] || tags == null || Array.isArray(tags) !== true) {
      return getters.list_tasks(list);
    } else if(tags.includes('No Tags') === true) {
      return getters.list_tasks(list).filter(
        (task) => { return (
          task.tags == null ||
          (
            Array.isArray(task.tags) &&
            task.tags.length == 0
          )
        )}
      );
    } else {
      return getters.list_tasks(list).filter(
        // For every task in the list
        (task) => { return (
          // For every tag we're limiting by
          tags.every(
            (tag) => { return (
              // Ensure that the task includes said tag
              task.tags.some(
                (task_tag) => { return (
                  task_tag.title == tag
                )}
              )
            )}
          )
        )}
      );
    }
  },
  today: (state, getters) => (list, tags) => {
    const endOfDay = DateTime.local().endOf('day').toMillis();

    return getters.tasks(list, tags).filter(
      (task) => { return (
        task.review_at == null ||
        DateTime.fromISO(task.review_at).toMillis() <= endOfDay
      )}
    );
  },
  tomorrow: (state, getters) => (list, tags) => {
    const tomorrow = DateTime.local().plus({ days: 1 });
    const startOfTomorrow = tomorrow.startOf('day').toMillis();
    const endOfTomorrow = tomorrow.endOf('day').toMillis();

    return getters.tasks(list, tags).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() >= startOfTomorrow &&
            DateTime.fromISO(task.review_at).toMillis() <= endOfTomorrow
          )
        } else {
          return false;
        }
      }
    );
  },
  upcoming: (state, getters) => (list, tags) => {
    const startOfUpcoming = DateTime.local().plus({ days: 2 }).startOf('day').toMillis();
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.tasks(list, tags).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() >= startOfUpcoming &&
            DateTime.fromISO(task.review_at).toMillis() <= endOfUpcoming
          )
        } else {
          return false;
        }
      }
    );
  },
  someday: (state, getters) => (list, tags) => {
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.tasks(list, tags).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() > endOfUpcoming
          )
        } else {
          return false;
        }
      }
    );
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
  async create({ commit, state, getters }, options) {
    return new Promise(
      (resolve, reject) => {
        options.order = getters.nextOrder;
        api.createTask(
          options,
          (response) => {
            commit('addTask', response.data);
            commit('lists/incrementCount',
              response.data.list_title,
              { root: true }
            );
            const hasTags = (
              Array.isArray(response.data.tags) &&
              response.data.tags.length > 0
            )
            if(hasTags) {
              response.data.tags.forEach(
                (tag) => {
                  commit('tags/incrementCount', tag, { root: true });
                }
              );
            } else {
              commit('tags/incrementNoTagsCount', {}, { root: true });
            }
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
    dispatch('refreshTasks');
    dispatch('refreshTreeview', options);
  },
  async refreshTasks({ commit, state }) {
    return new Promise(
      (resolve, reject) => {
        api.refreshTasks(
          (response) => {
            commit('setTasks', response.data);
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
  }
}

// mutations
const mutations = {
  addTask(state, task) {
    state.tasks.push(task);
  },
  setTasks(state, tasks) {
    state.tasks = tasks;
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
