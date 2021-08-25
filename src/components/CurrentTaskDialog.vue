<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide" :maximized="true">
    <q-card class="q-dialog-plugin">
      <q-card-section class="bg-primary text-white text-center">
        <div class="text-h6">Task Details</div>
        <q-btn class="q-ma-sm" size="md" color="positive" label="Mark Complete" />
        <q-btn class="q-ma-sm" size="md" color="negative" label="Delete" />
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
              clearable
            />
            <br>
            <q-select
              v-model="selectedTags"
              filled
              use-chips
              multiple
              :options="tags"
              option-value="id"
              option-label="title"
              label="Tags"
            />
            <br>
            <q-select
              v-model="selectedList"
              filled
              :options="lists"
              option-value="id"
              option-label="title"
              label="List"
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
import { useStore } from '../store'

export default {
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

    const $store = useStore()

    const currentTask = ref(props.task)
    const editTaskTitle = ref(currentTask.value.title)
    const selectedList = ref({ id: currentTask.value.list.id, title: currentTask.value.list.title })
    let temp = currentTask.value.tags.map(
      (tag) => {
        let temp = { id: tag.id, title: tag.title }
        console.log(temp)
        return temp
      }
    )
    console.log(temp)
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
      selectedList.value = { id: currentTask.value.list.id, title: currentTask.value.list.title }
      selectedTags.value = currentTask.value.tags.map(
        (tag) => {
          let temp = { id: tag.id, title: tag.title }
          console.log(temp)
          return temp
        }
      )
    }

    return {
      // Custom stuff
      currentTask,
      editTaskTitle,
      selectedList,
      selectedTags,
      lists,
      tags,
      //
      setCurrentTask,

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
