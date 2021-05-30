<template>
  <q-page class="row items-center justify-evenly">
    <q-card>
      <q-card-section>
        <q-icon name="terminal" />
        <p>TDL App</p>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md">
          <q-input
            filled
            label="Username"
          >
            <template v-slot:prepend>
              <q-icon name="user" />
            </template>
          </q-input>

          <q-input
            filled
            label="Password"
            type="password"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageLogin',

  setup() {
    return {};
  }
});
</script>
