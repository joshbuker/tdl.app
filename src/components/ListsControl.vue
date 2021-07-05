<template>
  <q-list>
    <q-item clickable v-ripple>
      <q-item-section>
        <q-item-label>All Tasks</q-item-label>
        <q-item-label caption>{{ allTasksCount }} tasks</q-item-label>
      </q-item-section>
    </q-item>
    <q-item
      clickable
      v-ripple
      v-for="list in lists"
      :key="list.id"
      :value="list.title"
    >
      <q-item-section>
        <q-item-label>{{ list.title }}</q-item-label>
        <q-item-label caption>0 tasks</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useStore } from '../store'

export default defineComponent({
  name: 'ListsControl',

  setup() {
    const $store = useStore()
    const allTasksCount = ref(0)

    const lists = computed({
      get: () => $store.state.lists.lists,
      set: value => {
        $store.commit('lists/setLists', value)
      }
    })

    return {
      allTasksCount,
      lists
    }
  }
})
</script>
