<template>
  <!-- For full height cards: <q-card class="full-height"> -->
  <q-card class="full-height">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">{{ title }}</div>
    </q-card-section>

    <q-card-section>
      <q-list>
        <q-item clickable v-ripple v-for="task in tasks" :key="task.id" @click="openTask(task)">
          <q-item-section avatar v-if="false">
            <q-checkbox v-model="selectedTasks" :val="task.id" />
          </q-item-section>

          <q-item-section>
            {{ task.title }}
            <div>
              <!-- <q-chip
                clickable
                icon="list"
                color="primary"
                @click.stop="true"
              >
                {{ task.list.title }}
              </q-chip> -->
              <q-chip
                clickable
                v-for="tag in task.tags"
                :key="tag.id"
                icon="local_offer"
                :style="'color: ' + textColor(tag.color) + '; background-color: ' + tag.color"
                @click.stop="toggleTag(tag.title)"
              >
                {{ tag.title }}
              </q-chip>
            </div>
          </q-item-section>
        </q-item>
        <template v-if="tasks.length == 0">
          <q-item clickable v-ripple>
            <q-item-section>
              <strong>Nothing yet!</strong>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  ref,
} from 'vue';
import { useQuasar } from 'quasar'
import { useStore } from '../store'
import { Todo, Meta } from './models';
import CurrentTaskDialog from 'components/CurrentTaskDialog.vue'

export default defineComponent({
  name: 'TaskDocket',
  props: {
    title: {
      type: String,
      required: true
    },
    tasks: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const $q = useQuasar()
    const $store = useStore()

    function openTask(task) {
      $q.dialog({
        component: CurrentTaskDialog,

        componentProps: {
          task: task
        }
      })
    }

    const selectedTasks = ref([])

    function toggleTag(title) {
      $store.commit('settings/toggleSelectedTag', title);
    }

    function textColor(backgroundColor) {
      if(!backgroundColor || 0 === backgroundColor.length) {
        return '#000000';
      } else {
        let input = backgroundColor.toString().replace('#', '');
        if(input.length != 6) {
          return '#000000';
        } else {
          let red = parseInt(input.substr(0,2), 16);
          let green = parseInt(input.substr(2,2), 16);
          let blue = parseInt(input.substr(4,2), 16);
          // Luminance values for different hues are not equal.
          let greyscale = red * 0.299 + green * 0.587 + blue * 0.114;
          // Perceived midpoint for grey is higher than 128. (around 186)
          let midpoint = 152;
          return (greyscale > midpoint) ? '#000000' : '#ffffff';
        }
      }
    }

    return { openTask, selectedTasks, toggleTag, textColor };
  },
});
</script>
