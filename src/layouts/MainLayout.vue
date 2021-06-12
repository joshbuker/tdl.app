<template>
  <q-layout view="hHh LpR fFf">
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
          {{ username }}
        </q-toolbar-title>

        <q-btn color='green' @click="logout">{{ $t('logout') }}</q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="250"
      :breakpoint="500"
      side="left" elevated
    >
      <q-tabs>
        <q-tab icon="fas fa-th-list" label="Lists" />
        <q-tab icon="fas fa-gem" label="Projects" />
        <q-tab icon="fas fa-tags" label="Tags" />
      </q-tabs>
    </q-drawer>

    <q-footer elevated class="bg-grey-8 text-white">
      <q-tabs shrink inline-label>
        <q-route-tab icon="fas fa-tasks" to="/" label="Tasks" />
        <q-route-tab icon="fas fa-user-cog" to="/settings" label="Settings" />
      </q-tabs>
    </q-footer>

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

    const username = computed({
      get: () => $store.state.settings.username,
      set: value => {
        $store.commit('settings/setUsername', value)
      }
    })

    function logout() {
      if(sessionToken.value === null) {
        $q.notify({
          color: 'negative',
          position: 'top',
          message: 'You can checkout anytime, but you can never leave.',
          icon: 'report_problem'
        })
        return
      }
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
        $q.notify({
          color: 'positive',
          position: 'top',
          message: 'Logged out successfully',
          icon: 'fas fa-sign-out-alt'
        })
      }).
      catch((error) => {
        var errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to logout: ${error.message}`
        }
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
      username,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      logout
    }
  }
})
</script>
