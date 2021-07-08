<template>
  <q-list>
    <draggable
      v-model="lists"
      :disabled="!editMode"
      item-key="id"
      handle=".handle"
      @start="dragging = true"
      @end="dragging = false"
    >
      <template #header>
        <q-item clickable v-ripple v-if="!editMode">
          <q-item-section>
            <q-item-label>All Tasks</q-item-label>
            <q-item-label caption>{{ allTasksCount }} tasks</q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <template #item="{ element }">
        <q-item
          v-bind:clickable="!editMode"
          v-bind:v-ripple="!editMode"
        >
          <q-item-section avatar v-show="editMode">
            <q-btn flat round icon="fas fa-bars" class="handle" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ element.title }}</q-item-label>
            <q-item-label caption>0 tasks</q-item-label>
          </q-item-section>

          <q-item-section avatar v-if="editMode">
            <q-btn flat round color="green" icon="fas fa-pencil-alt" @click="editList(element)" />
          </q-item-section>

          <q-item-section avatar v-if="editMode">
            <q-btn flat round color="red" icon="fas fa-trash" />
          </q-item-section>
        </q-item>
      </template>
    </draggable>
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
import { useQuasar } from 'quasar'
import { computed, defineComponent, ref } from 'vue'
import { useStore } from '../store'
import draggable from 'vuedraggable'
import EditListDialog from 'components/EditListDialog.vue'

export default defineComponent({
  name: 'ListsControl',
  components: { draggable },

  setup() {
    const $q = useQuasar()
    const $store = useStore()
    const allTasksCount = ref(0)
    const editMode = ref(false)
    const dragging = ref(false)

    const lists = computed({
      get: () => $store.state.lists.lists,
      set: value => {
        $store.commit('lists/setLists', value)
      }
    })

    function editList(list) {
      $q.dialog({
        component: EditListDialog,
      }).onOk(() => {
        const temp = {
          id: list.id,
          order: list.order,
          title: 'kekw'
        }
        $store.commit('lists/updateList', temp)
      }).onCancel(() => {
        console.log('Cancel')
      }).onDismiss(() => {
        console.log('Called on OK or Cancel')
      })
    }

    return {
      allTasksCount,
      editMode,
      editList,
      dragging,
      lists
    }
  }
})
</script>
