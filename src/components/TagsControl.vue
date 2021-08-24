<template>
  <q-list>
    <draggable
      v-model="tags"
      :disabled="!editMode"
      item-key="id"
      handle=".handle"
      @start="dragging = true"
      @end="dragging = false"
      @change="syncTagOrdering"
    >
      <template #header>
        <q-item
          clickable
          v-ripple
          v-if="!editMode"
          :active="tagSelected('No Tags')"
          @click="toggleTag('No Tags')"
        >
          <q-item-section>
            <q-item-label>No Tags</q-item-label>
            <q-item-label caption>{{ noTagsCount }} tasks</q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <template #item="{ element }">
        <q-item
          v-bind:clickable="!editMode"
          v-ripple="!editMode"
          :active="tagSelected(element.title)"
          @click="toggleTag(element.title)"
        >
          <q-item-section avatar v-show="editMode">
            <q-btn flat round icon="fas fa-bars" class="handle" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="ellipsis">{{ element.title }}</q-item-label>
            <q-item-label caption>{{ taskCount(element) }} tasks</q-item-label>
          </q-item-section>

          <q-item-section avatar v-if="editMode">
            <q-btn flat round color="green" icon="fas fa-pencil-alt" @click="editTag(element)" />
          </q-item-section>

          <q-item-section avatar v-if="editMode">
            <q-btn flat round color="red" icon="fas fa-trash" @click="deleteTag(element)" />
          </q-item-section>
        </q-item>
      </template>
    </draggable>
  </q-list>

  <q-input v-model="newTag" @keyup.enter="createTag" outlined class="q-ma-md" label="Create new tag" v-if="editMode">
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
import EditTagDialog from 'components/EditTagDialog.vue'
import Tag from '../models/tag'
import Task from '../models/task'

export default defineComponent({
  name: 'TagsControl',
  components: { draggable },

  setup() {
    const $q = useQuasar()
    const $store = useStore()
    const noTagsCount = computed({
      get: () => 69
    })
    const editMode = ref(false)
    const dragging = ref(false)
    const newTag = ref('')
    const selectedTag = computed({
      get: () => $store.state.settings.selectedTag,
      set: value => {
        $store.commit('settings/setSelectedTag', value)
      }
    })

    // const tags = computed({
    //   get: () => $store.state.tags.tags,
    //   set: value => {
    //     $store.commit('tags/setTags', value)
    //   }
    // })

    const tags = computed({
      get: () => $store.$repo(Tag).orderBy('order').orderBy('title').get(),
      set: value => {
        $store.$repo(Tag).save(value.map((element, index, array) => {
          return { ...element, order: index }
        }))
      }
    })

    function tagSelected(title) {
      return tags.value.some(
        (tag) => {
          tag.title === title
        }
      )
    }

    function toggleTag(title) {
      console.log(title)
    }

    function createTag() {
      $store.dispatch('tags/create', { title: newTag.value }).
      then(
        (response) => {
          newTag.value = '';
          $q.notify({
            color: 'positive',
            position: 'top',
            message: 'Added new tag',
            icon: 'tag'
          })
        },
        (error) => {
          // TODO: This is reused, DRY it up
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to add tag: ${error.message}`
          }
          $q.notify({
            color: 'negative',
            position: 'top',
            message: errorMessage,
            icon: 'report_problem'
          })
        }
      )
    }

    function editTag(tag) {
      /* The order that you define the callbacks does matter - it will affect
       * the order of execution. e.g. Dismiss goes before or after other
       * callbacks
       */
      $q.dialog({
        title: `Edit tag: "${tag.title}"`,
        ok: {
          label: 'Save',
          color: 'positive'
        },
        cancel: {
          color: 'grey'
        },
        prompt: {
          type: 'text',
          label: 'Title',
          model: tag.title,
          placeholder: tag.title
        },
        persistent: true
      }).onOk(
        (data) => {
          $store.dispatch('tags/update', { id: tag.id, title: data }).
          then(
            (response) => {
              if (selectedTag.value === tag.title) {
                selectedTag.value = data
              }

              $q.notify({
                color: 'positive',
                position: 'top',
                message: 'Updated tag title',
                icon: 'tag'
              })
            },
            (error) => {
              // TODO: This is reused, DRY it up
              let errorMessage = ''
              if (typeof error.response !== 'undefined') {
                errorMessage = error.response.data.error
              } else {
                errorMessage = `Failed to update tag: ${error.message}`
              }
              $q.notify({
                color: 'negative',
                position: 'top',
                message: errorMessage,
                icon: 'report_problem'
              })
            }
          )
        }
      )
    }

    function deleteTag(tag) {
      $q.dialog({
        title: `Delete tag: "${tag.title}"`,
        message: 'This cannot be undone! Are you sure?',
        ok: {
          label: 'Delete',
          color: 'negative'
        },
        cancel: {
          color: 'grey'
        }
      }).onOk(() => {
        $store.dispatch('tags/delete', { id: tag.id }).
        then(
          (response) => {
            if (selectedTag.value === tag.title) {
              selectedTag.value = 'No Tags'
            }

            $q.notify({
              color: 'positive',
              position: 'top',
              message: 'Removed tag',
              icon: 'tag'
            })
          },
          (error) => {
            // TODO: This is reused, DRY it up
            let errorMessage = ''
            if (typeof error.response !== 'undefined') {
              errorMessage = error.response.data.error
            } else {
              errorMessage = `Failed to remove tag: ${error.message}`
            }
            $q.notify({
              color: 'negative',
              position: 'top',
              message: errorMessage,
              icon: 'report_problem'
            })
          }
        )
      })
    }

    function syncTagOrdering() {
      $store.dispatch('tags/syncOrdering').
      then(
        (response) => {
          $q.notify({
            color: 'positive',
            position: 'top',
            message: 'Ordering Synced',
            icon: 'tag'
          })
        },
        (error) => {
          // TODO: This is reused, DRY it up
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to sync tag ordering: ${error.message}`
          }
          $q.notify({
            color: 'negative',
            position: 'top',
            message: errorMessage,
            icon: 'report_problem'
          })
        }
      )
    }

    function taskCount(tag) {
      return 69;
    }

    return {
      noTagsCount,
      createTag,
      editMode,
      editTag,
      deleteTag,
      newTag,
      dragging,
      tags,
      syncTagOrdering,
      selectedTag,
      taskCount,
      tagSelected,
      toggleTag,
    }
  }
})
</script>
