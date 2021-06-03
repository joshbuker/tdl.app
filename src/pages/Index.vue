<template>
  <q-page class="row items-center justify-evenly">
    <p>
      {{ sessionToken }}
    </p>
    <example-component
      title="Example component"
      active
      :todos="todos"
      :meta="meta"
    ></example-component>
  </q-page>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { Todo, Meta } from 'components/models';
import ExampleComponent from 'components/CompositionComponent.vue';
import { computed, defineComponent, ref } from 'vue';
import { useStore } from '../store'

export default defineComponent({
  name: 'PageIndex',
  components: { ExampleComponent },
  setup() {
    const $q = useQuasar()
    const $store = useStore()

    const sessionToken = computed({
      get: () => $store.state.settings.sessionToken,
      set: value => {
        $store.commit('settings/setSessionToken', value)
      }
    })

    const todos = ref<Todo[]>([
      {
        id: 1,
        content: 'ct1'
      },
      {
        id: 2,
        content: 'ct2'
      },
      {
        id: 3,
        content: 'ct3'
      },
      {
        id: 4,
        content: 'ct4'
      },
      {
        id: 5,
        content: 'ct5'
      }
    ]);
    const meta = ref<Meta>({
      totalCount: 1200
    });
    return { sessionToken, todos, meta };
  }
});
</script>
