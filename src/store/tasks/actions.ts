// @ts-nocheck
import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';
import { api } from 'boot/axios';
import Task from '../../models/task'

const actions: ActionTree<TasksStateInterface, StateInterface> = {
  async fetchTasks({ commit, getters, rootGetters }) {
    const response = await api.get('/tasks', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setTasks', response.data)
    this.$repo(Task).save(response.data)
    return response
  },

  async markComplete({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.patch(`/tasks/${options.id}/mark-complete`,
          {},
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('updateTask', response.data)
            this.$repo(Task).save(response.data)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async markIncomplete({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.patch(`/tasks/${options.id}/mark-incomplete`,
          {},
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('updateTask', response.data)
            this.$repo(Task).save(response.data)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async delete({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.delete(`/tasks/${options.id}`, {
          headers: {
            Authorization: rootGetters['authentication/bearerToken']
          }
        }).
        then(
          (response) => {
            commit('removeTask', options.id)
            this.$repo(Task).destroy(options.id)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async update({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.patch(`/tasks/${options.id}`,
          {
            title: options.title,
            notes: options.notes
          },
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('updateTask', response.data)
            this.$repo(Task).save(response.data)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async updateTags({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.patch(`/tasks/${options.id}/tags`,
          {
            tags: options.tags
          },
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('updateTask', response.data)
            this.$repo(Task).save(response.data)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async updateList({ commit, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.patch(`/tasks/${options.id}/list`,
          {
            list_id: options.list_id
          },
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('updateTask', response.data)
            this.$repo(Task).save(response.data)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },
};

export default actions;
