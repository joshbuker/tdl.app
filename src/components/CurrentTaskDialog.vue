<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide" :maximized="true">
    <q-card class="q-dialog-plugin">
      <q-card-section class="bg-primary text-white text-center">
        <div class="text-h6">Task Details</div>
        <template v-if="currentTask.completed_at == null">
          <q-btn class="q-ma-sm" size="md" color="positive" label="Mark Complete" @click="markTaskComplete(currentTask)" />
        </template>
        <template v-else>
          <q-btn class="q-ma-sm" size="md" color="primary" label="Mark Incomplete" @click="markTaskIncomplete(currentTask)" />
        </template>
        <q-btn class="q-ma-sm" size="md" color="negative" label="Delete" @click="deleteTask(currentTask)" />
        <q-btn class="q-ma-sm" size="md" color="grey" label="Close" @click="onCancelClick" />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col">
            <div class="text-h4 text-primary">{{ currentTask.title }}</div>
            <br>
            <q-input
              v-model="editTaskTitle"
              filled
              label="Task title"
              :placeholder="currentTask.title"
              @keyup.enter="updateTaskTitle"
              clearable
            />
            <br>
            <q-select
              v-model="selectedTags"
              filled
              use-chips
              multiple
              clearable
              @update:model-value="updateTaskTags"
              :options="tags"
              option-value="id"
              option-label="title"
              label="Tags"
            />
            <br>
            <q-select
              v-model="selectedList"
              filled
              @update:model-value="updateTaskList"
              :options="lists"
              option-value="id"
              option-label="title"
              label="List"
            />
            <br>
            <q-datetime-input
              v-model="editTaskReviewAt"
              @update:model-value="updateTaskReviewAt"
              label="Review at"
            />
            <br>
            <q-input
              v-model="editTaskNotes"
              filled
              autogrow
              @update:model-value="updateTaskNotes"
              debounce="1000"
              label="Notes"
            />
          </div>
          <div class="col">
            <div class="text-h5">Prerequisites</div>
            <q-list>
              <q-item clickable v-ripple v-if="!currentTask.prereqs.length">
                <q-item-section>No prerequisites</q-item-section>
              </q-item>
              <q-item
                clickable
                v-ripple
                v-for="pre in currentTask.prereqs"
                :key="pre.id"
                @click="setCurrentTask(pre)"
              >
                <q-item-section>
                  {{ pre.title }}
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-h5">Postrequisites</div>
            <q-list>
              <q-item clickable v-ripple v-if="!currentTask.postreqs.length">
                <q-item-section>No postrequisites</q-item-section>
              </q-item>
              <q-item
                clickable
                v-ripple
                v-for="post in currentTask.postreqs"
                :key="post.id"
                @click="setCurrentTask(post)"
              >
                <q-item-section>
                  {{ post.title }}
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { TaskModel } from 'components/models';
import QDatetimeInput from 'components/QDatetimeInput.vue';
import {
  defineComponent,
  PropType,
  computed,
  ref,
  toRef,
  Ref,
} from 'vue';
import List from '../models/list'
import Task from '../models/task'
import Tag from '../models/tag'
import { useQuasar } from 'quasar'
import { useStore } from '../store'

export default {
  components: { QDatetimeInput },

  props: {
    task: {
      type: TaskModel,
      required: true
    }
  },

  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits
  ],

  setup (props) {
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    // dialogRef      - Vue ref to be applied to QDialog
    // onDialogHide   - Function to be used as handler for @hide on QDialog
    // onDialogOK     - Function to call to settle dialog with "ok" outcome
    //                    example: onDialogOK() - no payload
    //                    example: onDialogOK({ /*.../* }) - with payload
    // onDialogCancel - Function to call to settle dialog with "cancel" outcome

    const $q = useQuasar()
    const $store = useStore()

    const currentTask = ref(props.task)
    const editTaskTitle = ref(currentTask.value.title)
    const editTaskNotes = ref(currentTask.value.notes)
    const editTaskReviewAt = ref(currentTask.value.review_at)
    const selectedList = ref({ id: currentTask.value.list.id, title: currentTask.value.list.title })
    let temp = currentTask.value.tags.map(
      (tag) => {
        let temp = { id: tag.id, title: tag.title }
        return temp
      }
    )
    const selectedTags = ref([])
    selectedTags.value = temp

    const lists = computed({
      get: () => $store.$repo(List).with('tasks').orderBy('order').orderBy('title').get()
    })

    const tags = computed({
      get: () => $store.$repo(Tag).orderBy('order').orderBy('title').get()
    })

    function setCurrentTask(newTask) {
      currentTask.value = $store.$repo(Task).with('list').with('prereqs').with('postreqs').with('tags').find(newTask.id)
      editTaskTitle.value = currentTask.value.title
      editTaskNotes.value = currentTask.value.notes
      editTaskReviewAt.value = currentTask.value.review_at
      selectedList.value = { id: currentTask.value.list.id, title: currentTask.value.list.title }
      selectedTags.value = currentTask.value.tags.map(
        (tag) => {
          let temp = { id: tag.id, title: tag.title }
          return temp
        }
      )
    }

    function markTaskComplete(task) {
      $store.dispatch('tasks/markComplete', { id: task.id }).
      then(
        (response) => {
          onDialogOK()
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to mark task as complete: ${error.message}`
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

    function markTaskIncomplete(task) {
      $store.dispatch('tasks/markIncomplete', { id: task.id }).
      then(
        (response) => {
          onDialogOK()
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to mark task as incomplete: ${error.message}`
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

    function deleteTask(task) {
      $store.dispatch('tasks/delete', { id: task.id }).
      then(
        (response) => {
          onDialogOK()
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to delete task: ${error.message}`
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

    function updateTaskTitle() {
      $store.dispatch('tasks/update', {
        id: currentTask.value.id,
        title: editTaskTitle.value
      }).
      then(
        (response) => {
          setCurrentTask(currentTask.value)
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to update task title: ${error.message}`
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

    function updateTaskTags() {
      $store.dispatch('tasks/updateTags', {
        id: currentTask.value.id,
        tags: selectedTags.value
      }).
      then(
        (response) => {
          setCurrentTask(currentTask.value)
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to update task tags: ${error.message}`
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

    function updateTaskList() {
      $store.dispatch('tasks/updateList', {
        id: currentTask.value.id,
        list_id: selectedList.value.id
      }).
      then(
        (response) => {
          setCurrentTask(currentTask.value)
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to update task list: ${error.message}`
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

    function updateTaskNotes() {
      $store.dispatch('tasks/update', {
        id: currentTask.value.id,
        notes: editTaskNotes.value
      }).
      then(
        (response) => {
          setCurrentTask(currentTask.value)
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to update task notes: ${error.message}`
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

    function updateTaskReviewAt() {
      $store.dispatch('tasks/update', {
        id: currentTask.value.id,
        review_at: editTaskReviewAt.value
      }).
      then(
        (response) => {
          setCurrentTask(currentTask.value)
        },
        (error) => {
          let errorMessage = ''
          if (typeof error.response !== 'undefined') {
            errorMessage = error.response.data.error
          } else {
            errorMessage = `Failed to update task review at: ${error.message}`
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

    return {
      // Custom stuff
      currentTask,
      editTaskTitle,
      editTaskNotes,
      editTaskReviewAt,
      selectedList,
      selectedTags,
      lists,
      tags,
      //
      setCurrentTask,
      markTaskComplete,
      markTaskIncomplete,
      updateTaskTitle,
      updateTaskTags,
      updateTaskList,
      updateTaskNotes,
      updateTaskReviewAt,
      deleteTask,

      // This is REQUIRED;
      // Need to inject these (from useDialogPluginComponent() call)
      // into the vue scope for the vue html template
      dialogRef,
      onDialogHide,

      // other methods that we used in our vue html template;
      // these are part of our example (so not required)
      onOKClick () {
        // on OK, it is REQUIRED to
        // call onDialogOK (with optional payload)
        onDialogOK()
        // or with payload: onDialogOK({ ... })
        // ...and it will also hide the dialog automatically
      },

      // we can passthrough onDialogCancel directly
      onCancelClick: onDialogCancel
    }
  }
}
</script>
