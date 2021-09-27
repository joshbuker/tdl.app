<template>
  <q-page>
    <div class="row items-start justify-center text-right q-col-gutter-md q-ma-md">
      <div class="col-grow">
        <q-btn color="primary" icon="fas fa-check-double" label="Multi select" @click="multiSelectEnabled = !multiSelectEnabled" />
      </div>
    </div>
    <!-- For full height cards: <q-page class="row items-stretch justify-evenly q-col-gutter-md q-ma-md"> -->
    <div class="row items-start justify-evenly q-col-gutter-md q-ma-md">
      <div class="col-grow">
        <task-docket
          title="Today"
          :tasks="today"
          :multi-select-enabled="multiSelectEnabled"
        ></task-docket>
      </div>
      <div class="col-grow">
        <task-docket
          title="Tomorrow"
          :tasks="tomorrow"
          :multi-select-enabled="multiSelectEnabled"
        ></task-docket>
      </div>
      <div class="col-grow">
        <task-docket
          title="Upcoming"
          :tasks="upcoming"
          :multi-select-enabled="multiSelectEnabled"
        ></task-docket>
      </div>
      <div class="col-grow">
        <task-docket
          title="Someday"
          :tasks="someday"
          :multi-select-enabled="multiSelectEnabled"
        ></task-docket>
      </div>
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


let LocalNotifications = null

if (process.env.MODE === 'capacitor') {
  import('@capacitor/core').then(
    ({ Plugins }) => {
      LocalNotifications = Plugins.LocalNotifications
    }
  )
}

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

    function beepBoopIn5() {
      if (process.env.MODE === 'capacitor') {
        LocalNotifications.schedule({
          notifications: [
            {
              title: 'Title',
              body: 'Body',
              id: 1,
              schedule: { at: new Date(Date.now() + 1000 * 5) },
              sound: null,
              attachments: null,
              actionTypeId: '',
              extra: null,
            },
          ],
        });
      } else {
        console.log('No beep boop on web')
      }
    }

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

    const multiSelectEnabled = ref(false)

    return { beepBoopIn5, sessionToken, today, tomorrow, upcoming, someday, multiSelectEnabled };
  }
});
</script>
