<template>
  <q-card>
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">{{ title }}</div>
    </q-card-section>

    <q-card-section>
      <q-list>
        <q-item clickable v-ripple v-for="todo in todos" :key="todo.id">
          <q-item-section>
            {{ todo.title }} - {{ todo.list.title }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  computed,
  ref,
  toRef,
  Ref,
} from 'vue';
import { Todo, Meta } from './models';

function useDisplayTodo(todos: Ref<Todo[]>) {
  const todoCount = computed(() => todos.value.length);
  return { todoCount };
}

export default defineComponent({
  name: 'TaskDocket',
  props: {
    title: {
      type: String,
      required: true
    },
    todos: {
      type: Array as PropType<Todo[]>,
      default: () => []
    }
  },
  setup(props) {
    return { ...useDisplayTodo(toRef(props, 'todos')) };
  },
});
</script>
