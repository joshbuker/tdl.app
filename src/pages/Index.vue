<template>
  <!-- For full height cards: <q-page class="row items-stretch justify-evenly q-col-gutter-md q-ma-md"> -->
  <q-page class="row items-start justify-evenly q-col-gutter-md q-ma-md">
    <div class="col-grow">
      <task-docket
        title="Today"
        :tasks="today"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Tomorrow"
        :tasks="tomorrow"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Upcoming"
        :tasks="upcoming"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Someday"
        :tasks="someday"
      ></task-docket>
    </div>
  </q-page>
</template>

<script lang="ts">
// import { useQuasar } from 'quasar'
import { Todo, Meta } from 'components/models';
import TaskDocket from 'components/TaskDocket.vue';
import { computed, defineComponent, ref } from 'vue';
import { useStore } from '../store'
import Task from '../models/task'

export default defineComponent({
  name: 'PageIndex',
  components: { TaskDocket },

  preFetch({ store, redirect }) {
    const isAuthenticated =
      (
        store.state.authentication.sessionToken !== null &&
        store.state.authentication.sessionToken.length > 0
      )
    if (!isAuthenticated) {
      redirect({ path: '/login' })
    }
  },

  setup() {
    // const $q = useQuasar()
    const $store = useStore()

    const sessionToken = computed({
      get: () => $store.state.authentication.sessionToken,
      set: value => {
        $store.commit('authentication/setSessionToken', value)
      }
    })

    const selectedList = computed({
      get: () => $store.state.settings.selectedList,
      set: value => {
        $store.commit('settings/setSelectedList', value)
      }
    })

    const selectedTags = computed({
      get: () => $store.state.settings.selectedTags,
      set: value => {
        $store.commit('settings/setSelectedTags', value)
      }
    })

    const allTagsFilter = computed({
      get: () => $store.state.settings.allTagsFilter,
      set: value => {
        $store.commit('settings/setAllTagsFilter', value)
      }
    })

    const today = computed({
      get: () => $store.getters['tasks/today']($store, selectedList.value, selectedTags.value, allTagsFilter.value)
    })

    const tomorrow = computed({
      get: () => $store.getters['tasks/tomorrow']($store, selectedList.value, selectedTags.value, allTagsFilter.value)
    })

    const upcoming = computed({
      get: () => $store.getters['tasks/upcoming']($store, selectedList.value, selectedTags.value, allTagsFilter.value)
    })

    const someday = computed({
      get: () => $store.getters['tasks/someday']($store, selectedList.value, selectedTags.value, allTagsFilter.value)
    })

    return { sessionToken, today, tomorrow, upcoming, someday };
  }
});
</script>
