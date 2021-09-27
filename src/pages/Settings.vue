<template>
  <q-page class="row items-center justify-evenly">
    <q-card>
      <q-card-section class="bg-grey-8 text-white">
        <q-item>
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>
            <div class="text-h5">Settings</div>
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-section>
        <h2>Hello there</h2>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PageSettings'
})
</script>
