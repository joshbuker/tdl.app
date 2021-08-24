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
        <div class="row">
          <div class="col">
            <div class="text-h4 text-primary">{{ currentTask.title }}</div>
            <q-input
              v-model="editTaskTitle"
              filled
              label="Task title"
              :placeholder="currentTask.title"
              clearable
            />
            <!-- Tags here -->
            <q-select
              v-model="selectedList"
              filled
              :options="lists"
              option-value="id"
              option-label="title"
              label="List"
            />
          </div>
        </div>
        <ul>
          <li v-for="pre in currentTask.prereqs" @click="setCurrentTask(pre)">
            {{ pre.title }}
          </li>
        </ul>
        <ul>
          <li v-for="post in currentTask.postreqs" @click="setCurrentTask(post)">
            {{ post.title }}
          </li>
        </ul>
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

    const lists = computed({
      get: () => $store.$repo(List).with('tasks').orderBy('order').orderBy('title').get()
    })

    function setCurrentTask(newTask) {
      currentTask.value = $store.$repo(Task).with('list').with('prereqs').with('postreqs').find(newTask.id)
      editTaskTitle.value = currentTask.value.title
      selectedList.value = { id: currentTask.value.list.id, title: currentTask.value.list.title }
    }

    console.log(selectedList.value);
    console.log(lists.value);

    return {
      // Custom stuff
      currentTask,
      editTaskTitle,
      selectedList,
      lists,
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
