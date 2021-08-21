<template>
  <!-- For full height cards: <q-page class="row items-stretch justify-evenly q-col-gutter-md q-ma-md"> -->
  <q-page class="row items-start justify-evenly q-col-gutter-md q-ma-md">
    <div class="col-grow">
      <task-docket
        title="Today"
        :todos="today"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Tomorrow"
        :todos="tomorrow"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Upcoming"
        :todos="upcoming"
      ></task-docket>
    </div>
    <div class="col-grow">
      <task-docket
        title="Someday"
        :todos="someday"
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

    const todos = ref<Todo[]>([
      {
        id: 1,
        content: 'A long sentence goes here'
      },
      {
        id: 2,
        content: 'ct2'
      },
      {
        id: 3,
        content: 'ct3'
      },
      {
        id: 4,
        content: 'ct4'
      },
      {
        id: 5,
        content: 'ct5'
      }
    ]);

    // const tasks = computed({
    //   get: () => $store.state.tasks.tasks,
    //   set: value => {
    //     $store.commit('tasks/setTasks', value)
    //   }
    // })

    const selectedList = computed({
      get: () => $store.state.settings.selectedList,
      set: value => {
        $store.commit('settings/setSelectedList', value)
      }
    })

    const today = computed({
      get: () => $store.getters['tasks/today']($store, selectedList)
    })

    const tomorrow = computed({
      get: () => $store.getters['tasks/tomorrow']($store, selectedList)
    })

    const upcoming = computed({
      get: () => $store.getters['tasks/upcoming']($store, selectedList)
    })

    const someday = computed({
      get: () => $store.getters['tasks/someday']($store, selectedList)
    })

    return { sessionToken, todos, today, tomorrow, upcoming, someday };
  }
});
</script>
