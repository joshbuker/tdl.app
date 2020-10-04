import rest from '../../api/rest.js.erb'

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
  createList({ commit, state }, options, onSuccess, onFailure) {
    rest.createList(
      options,
      (response) => {
        commit('addList', response.data);
        onSuccess(response);
      },
      (error) => {
        onFailure(error);
      }
    );
  },
  async deleteList({ commit, state }, options) {
    return new Promise(
      (resolve, reject) => {
        rest.deleteList(
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
  refresh({ commit, state }, onSuccess, onFailure) {
    rest.refreshLists(
      (response) => {
        commit('setLists', response.data);
        onSuccess(response);
      },
      (error) => {
        onFailure(error);
      }
    )
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

// actions
// const actions = {
//   checkout ({ commit, state }, products) {
//     const savedCartItems = [...state.items]
//     commit('setCheckoutStatus', null)
//     // empty cart
//     commit('setCartItems', { items: [] })
//     shop.buyProducts(
//       products,
//       () => commit('setCheckoutStatus', 'successful'),
//       () => {
//         commit('setCheckoutStatus', 'failed')
//         // rollback to the cart saved before sending the request
//         commit('setCartItems', { items: savedCartItems })
//       }
//     )
//   },

//   addProductToCart ({ state, commit }, product) {
//     commit('setCheckoutStatus', null)
//     if (product.inventory > 0) {
//       const cartItem = state.items.find(item => item.id === product.id)
//       if (!cartItem) {
//         commit('pushProductToCart', { id: product.id })
//       } else {
//         commit('incrementItemQuantity', cartItem)
//       }
//       // remove 1 item from stock
//       commit('products/decrementProductInventory', { id: product.id }, { root: true })
//     }
//   }
// }
