import { ActionTree } from 'vuex';
import { StateInterface } from '../index';
import { ListsStateInterface } from './state';
import { api } from 'boot/axios';

const actions: ActionTree<ListsStateInterface, StateInterface> = {
  async create({ commit, getters, rootGetters }, options) {
    return new Promise(
      (resolve, reject) => {
        api.post('/lists',
          {
            title: options.title,
            order: getters.nextOrder
          },
          {
            headers: {
              Authorization: rootGetters['authentication/bearerToken']
            }
          }
        ).
        then(
          (response) => {
            commit('addList', response.data)
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
        api.delete(`/lists/${options.id}`, {
          headers: {
            Authorization: rootGetters['authentication/bearerToken']
          }
        }).
        then(
          (response) => {
            commit('removeList', options.id)
            resolve(response)
          },
          (error) => {
            reject(error)
          }
        )
      }
    )
  },

  async fetchLists({ commit, rootGetters }) {
    const response = await api.get('/lists', {
      headers: { Authorization: rootGetters['authentication/bearerToken'] },
      params: {}
    })
    commit('setLists', response.data)
    return response
  },
};

export default actions;
