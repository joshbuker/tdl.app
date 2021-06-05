<template>
  <q-page class="row items-center justify-evenly">
    <q-card>
      <q-card-section class="bg-grey-8 text-white">
        <q-item>
          <q-item-section avatar>
            <q-icon name="fas fa-terminal" />
          </q-item-section>
          <q-item-section>
            <div class="text-h5">TDL App</div>
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" autofocus>
          <q-input
            v-model="username"
            filled
            :label="$t('username')"
          >
            <template v-slot:prepend>
              <q-icon name="account_circle" />
            </template>
          </q-input>

          <q-input
            v-model="password"
            filled
            :label="$t('password')"
            type="password"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat>{{ $t('register') }}</q-btn>
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { useStore } from '../store'
import { useRouter } from 'vue-router'
import { computed, defineComponent, ref } from 'vue'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'PageRegister',

  preFetch({ store, redirect }) {
    const isAuthenticated = (store.state.authentication.sessionToken.length > 0)
    if (isAuthenticated) {
      redirect({ path: '/' })
    }
  },

  setup() {
    return {};
  }
});
</script>
