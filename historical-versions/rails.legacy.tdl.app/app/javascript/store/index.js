import Vue from 'vue'
import Vuex from 'vuex'
import lists from './modules/lists'
import settings from './modules/settings'
import tags from './modules/tags'
import tasks from './modules/tasks'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  modules: {
    lists,
    settings,
    tags,
    tasks
  },
  strict: debug
})
