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
  nextOrder: (state, getters) => (list, time) => {
    let timeframe;
    if(list == undefined || list == null) list = 'All Tasks';
    if(time == "today") timeframe = getters.today(list, []);
    else if(time == "tomorrow") timeframe = getters.tomorrow(list, []);
    else if(time == "upcoming") timeframe = getters.upcoming(list, []);
    else if(time == "someday") timeframe = getters.someday(list, []);
    else return undefined;
    return timeframe.length < 1 ? undefined : timeframe[timeframe.length - 1].order + 1;
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
        options.order = getters.nextOrder(options.list, options.time);
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
  async moveTask({ commit, state, dispatch }, options) {
    await dispatch('updatePosition', options);
    dispatch('syncOrdering');
  },
  async moveTaskColumn({ commit, state, dispatch }, options) {
    await dispatch('updateColumnAndPosition', options);
    dispatch('syncOrdering');
  },
  async updatePosition({ commit, state, dispatch }, options) {
    let newGlobalIndex;
    var newLocalIndex = options.event.moved.newIndex;
    if (newLocalIndex != 0) {
      newGlobalIndex = state.tasks.findIndex((element) => { return (element.id == options.list[newLocalIndex-1].id) }) + 1;
      console.log("local-1 id ", options.list[newLocalIndex-1].id);
    }
    else if (newLocalIndex != options.list.length-1) {
      newGlobalIndex = state.tasks.findIndex((element) => { return (element.id == options.list[newLocalIndex+1].id) }) - 1;
      console.log("local+1 id ", options.list[newLocalIndex+1].id);
    }
    console.log("newGlobalIndex: ", newGlobalIndex);
    let movedID = options.event.moved.element.id;
    let oldGlobalIndex = state.tasks.findIndex((element) => { return (element.id == movedID) });
    commit('moveTask', { oldIndex: oldGlobalIndex, newIndex: newGlobalIndex });
  },
  async updateColumnAndPosition({ commit, state, getters, dispatch }, options) {
    let newGlobalIndex;
    var newLocalIndex = options.event.added.newIndex;
    if(options.list.length == 0) {
      if(options.time == 'today' || options.time == 'tomorrow') {
        newGlobalIndex = state.tasks.findIndex((element) => {
          return (element.id == getters.today('All Tasks', [])[getters.today('All Tasks', []).length-1].id)
        }) + 1;
      }
      else if(options.time == 'upcoming') {
        newGlobalIndex = state.tasks.findIndex((element) => {
          return (element.id == getters.tomorrow('All Tasks', [])[getters.tomorrow('All Tasks', []).length-1].id)
        }) + 1;
      }
      else if(options.time == 'someday') {
        newGlobalIndex = state.tasks.findIndex((element) => {
          return (element.id == getters.upcoming('All Tasks', [])[getters.upcoming('All Tasks', []).length-1].id)
        }) + 1;
      }
      else {
        console.log("inside the else");
      }
    }
    else if (newLocalIndex != 0) {
      newGlobalIndex = state.tasks.findIndex((element) => { return (element.id == options.list[newLocalIndex-1].id) }) + 1;
      console.log("local-1 id ", options.list[newLocalIndex-1].id);
    }
    else if (newLocalIndex != options.list.length-1) {
      newGlobalIndex = state.tasks.findIndex((element) => { return (element.id == options.list[newLocalIndex+1].id) }) - 1;
      console.log("local+1 id ", options.list[newLocalIndex+1].id);
    }
    console.log("newGlobalIndex: ", newGlobalIndex);
    let movedID = options.event.added.element.id;
    let oldGlobalIndex = state.tasks.findIndex((element) => { return (element.id == movedID) });

    await api.updateTaskReviewAt(
      {
        id: movedID,
        time: options.time
      },
      (response) => {
        let newTask = JSON.parse(JSON.stringify(options.event.added.element));
        newTask.review_at = response.data;
        console.log('replacement task goes: ', newTask);
        commit('moveTaskToColumn', { oldIndex: oldGlobalIndex, newIndex: newGlobalIndex, task: newTask });
      },
      (error) => {}
    )
  },
  async syncOrdering({ commit, state, dispatch }) {
    for(var current_order = 0; current_order < state.tasks.length; current_order++) {
      if(current_order != state.tasks[current_order].order) {
        dispatch('update', {
          id: state.tasks[current_order].id,
          order: current_order
        })
      }
    }
  },
  async update({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTask(
          options,
          (response) => {
            commit('updateTask', response.data);
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
  async updateRemindMe({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        api.updateTaskRemindMe(
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
  moveTask(state, options) {
    console.log(options.oldIndex);
    console.log(options.newIndex);
    state.tasks.splice(options.newIndex, 0, state.tasks.splice(options.oldIndex, 1)[0]);
  },
  moveTaskToColumn(state, options) {
    console.log(options.oldIndex);
    console.log(options.newIndex);
    state.tasks.splice(options.oldIndex, 1);
    state.tasks.splice(options.newIndex, 0, options.task);
  },
  setTasks(state, tasks) {
    state.tasks = tasks;
  },
  // setToday(state, tasks) {
  //   find global index for all tasks in column
  //   global index move for any tasks out of order in global
  //   var global_indexes = [];
/*    for task in tasks {
      global_indexes.push(state.tasks.findIndex((element) => { return (element.id == task.id) } ));
    }*/
  //   for(int a = 0; a < global_indexes.length - 2; a++) {
  //     if(global_indexes.length > 1) {
  //       for(int b = 1; b < global_indexes.length - 1; b++) {
  //         if(a > b) {a is the one that moved}
  //       }
  //     }
  //   }

  //   var prev = global_indexes[0]
  //   for(int i = 1; i < global_indexes.length - 1; i++) {
  //     if(prev > global_indexes[i]) {
  //       // if item was moved up: last was moved
  //       // if item was moved down: global_indexes[i] was moved
  //     }
  //   }
  //   state.tasks
  // }
  setTreeview(state, tasks) {
    state.treeview = tasks;
  },
  setSearch(state, tasks) {
    state.search = tasks;
  },
  updateTask(state, task) {
    const index = state.tasks.findIndex(
      (element) => { return (element.id == task.id) }
    );
    state.tasks.splice(index, 1, task);
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
