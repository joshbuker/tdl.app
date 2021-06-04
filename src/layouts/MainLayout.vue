<template>
  <q-layout view="hHh Lpr lff">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          TDL App
        </q-toolbar-title>

        <q-btn color='green' @click="logout">{{ $t('logout') }}</q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="200"
      :breakpoint="500"
    >
      <q-scroll-area class="fit">
        <q-list padding class="menu-list">
          <q-item clickable v-ripple exact to="/">
            <q-item-section avatar>
              <q-icon name="home" />
            </q-item-section>

            <q-item-section>
              Home
            </q-item-section>
          </q-item>

          <q-item clickable v-ripple exact to="/login">
            <q-item-section avatar>
              <q-icon name="lock" />
            </q-item-section>

            <q-item-section>
              Login
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { useStore } from '../store'
import { useRouter } from 'vue-router'
import { computed, defineComponent, ref } from 'vue'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'MainLayout',

  setup () {
    const $q = useQuasar()
    const $store = useStore()
    const $router = useRouter()

    const leftDrawerOpen = ref(false)

    const sessionToken = computed({
      get: () => $store.state.authentication.sessionToken,
      set: value => {
        $store.commit('authentication/setSessionToken', value)
      }
    })

    function logout() {
      api.delete('/logout', {
        headers: {
          Authorization: `Bearer ${sessionToken.value}`
        },
        dataType: 'json',
        contentType: 'application/json'
      }).
      then((response) => {
        sessionToken.value = null
        $router.push({ path: '/login' })
      }).
      catch((error) => {
        var errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to logout: ${error.message}`
        }
        // $("input[name='password']").focus()
        $q.notify({
          color: 'negative',
          position: 'top',
          message: errorMessage,
          icon: 'report_problem'
        })
      })
    }

    return {
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      logout
    }
  }
})
</script>
