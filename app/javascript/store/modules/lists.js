import rest from '../../api/rest'

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
  }
}

const actions = {
  createList ({ commit, state}, newListTitle, onSuccess, onFailure) {
    rest.createList(
      { title: newListTitle },
      () => {
        this.lists.push(response.data);
        onSuccess();
      },
      (error) => {
        onFailure(error);
      }
    );
    axios.post('<%= lists_url %>', {
      title: newListTitle,
      credentials: 'same-origin',
      'X-CSRF-Token': token,
      'authenticity_token': token
    }).
    then(response => {
      this.lists.push(response.data);
      onSuccess();
    }).
    catch(error => {
      onFailure(error);
    });
  }
  incrementAction ({ commit, state }) {
    commit('increment')
  }
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

// mutations
const mutations = {
  increment (state) {
    // `state` is the local module state
    state.count++
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
