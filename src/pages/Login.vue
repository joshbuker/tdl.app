<template>
  <q-page class="row items-center justify-evenly">
    <p>
      {{ sessionToken }}
    </p>
    <q-card>
      <q-card-section class="bg-grey-8 text-white">
        <q-item>
          <q-item-section avatar>
            <q-icon name="list" />
          </q-item-section>
          <q-item-section>
            <div class="text-h5">TDL App</div>
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md">
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
        <q-btn flat @click="login">{{ $t('login') }}</q-btn>
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { computed, defineComponent, ref } from 'vue'
import { api } from 'boot/axios'
import { useStore } from '../store'

export default defineComponent({
  name: 'PageLogin',

  setup() {
    const $q = useQuasar()
    const $store = useStore()

    const username = ref('')
    const password = ref('')

    const sessionToken = computed({
      get: () => $store.state.settings.sessionToken,
      set: value => {
        $store.commit('settings/setSessionToken', value)
      }
    })

    if ($q.localStorage.has('sessionToken')) {
      sessionToken.value = $q.localStorage.getItem('sessionToken')!
    }

    function login() {
      api.post('/login', {
        username: username.value,
        password: password.value,
        dataType: 'json',
        contentType: 'application/json'
      }).
      then((response) => {
        sessionToken.value = response.data.session_token
        $q.localStorage.set('sessionToken', sessionToken.value)
      }).
      catch((error) => {
        var errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to login: ${error.message}`
        }
        password.value = ''
        // $("input[name='password']").focus()
        $q.notify({
          color: 'negative',
          position: 'top',
          message: errorMessage,
          icon: 'report_problem'
        })
      })
    }
    return { sessionToken, username, password, login };
  }
});
</script>
