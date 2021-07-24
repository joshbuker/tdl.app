<template>
  <q-page class="row items-center justify-evenly q-col-gutter-md q-ma-md">
    <!-- FIXME: Don't use min-width hack, figure out responsive way to expand
                the columns
    -->
    <div class="col">
      <task-docket
        title="Today"
        :todos="tasks"
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

    const tasks = computed({
      get: () => $store.state.tasks.tasks,
      set: value => {
        $store.commit('tasks/setTasks', value)
      }
    })

    return { sessionToken, todos, tasks };
  }
});
</script>
