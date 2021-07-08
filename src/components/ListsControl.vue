<template>
  <q-list>
    <q-item clickable v-ripple v-if="!editMode">
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
      <q-item-section avatar v-show="editMode">
        <q-btn flat round icon="fas fa-bars" />
      </q-item-section>

      <q-item-section>
        <q-item-label>{{ list.title }}</q-item-label>
        <q-item-label caption>0 tasks</q-item-label>
      </q-item-section>

      <q-item-section avatar v-if="editMode">
        <q-btn flat round color="green" icon="fas fa-pencil-alt" />
      </q-item-section>

      <q-item-section avatar v-if="editMode">
        <q-btn flat round color="red" icon="fas fa-trash" />
      </q-item-section>
    </q-item>
  </q-list>

  <q-input outlined class="q-ma-md" label="Create new list" v-if="editMode">
    <template v-slot:append>
      <q-icon name="fas fa-arrow-up" />
    </template>
  </q-input>

  <div class="row justify-center q-my-md">
    <template v-if="editMode">
      <q-btn icon="fas fa-check" label="Done" @click="editMode = false" />
    </template>

    <template v-else>
      <q-btn icon="fas fa-pencil-alt" label="Edit" @click="editMode = true" />
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useStore } from '../store'

export default defineComponent({
  name: 'ListsControl',

  setup() {
    const $store = useStore()
    const allTasksCount = ref(0)
    const editMode = ref(false)

    const lists = computed({
      get: () => $store.state.lists.lists,
      set: value => {
        $store.commit('lists/setLists', value)
      }
    })

    return {
      allTasksCount,
      editMode,
      lists
    }
  }
})
</script>
