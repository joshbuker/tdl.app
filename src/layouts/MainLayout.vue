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
      :width="300"
      :breakpoint="500"
      side="left" elevated
    >
      <q-tabs v-model="drawerTabs">
        <q-tab icon="fas fa-th-list text-light-blue-3" name="lists" label="Lists" />
        <!-- <q-tab icon="fas fa-gem text-light-blue-3" name="projects" label="Projects" /> -->
        <q-tab icon="fas fa-tags text-light-blue-3" name="tags" label="Tags" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="drawerTabs" animated>
        <q-tab-panel class="q-pa-none" name="lists">
          <ListsControl />
        </q-tab-panel>

        <q-tab-panel name="projects">
          <p>Projects here</p>
        </q-tab-panel>

        <q-tab-panel name="tags">
          <p>Tags here</p>
        </q-tab-panel>
      </q-tab-panels>
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
import ListsControl from 'components/ListsControl.vue'

export default defineComponent({
  name: 'MainLayout',
  components: { ListsControl },

  setup () {
    const $q = useQuasar()
    const $store = useStore()
    const $router = useRouter()

    const leftDrawerOpen = ref(false)
    const drawerTabs = ref('lists')

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
      if(sessionToken.value === null || sessionToken.value === '') {
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
          Authorization: `Bearer ${sessionToken.value}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }).
      then(() => {
        sessionToken.value = ''
        void $router.push({ path: '/login' })
        $q.notify({
          color: 'positive',
          position: 'top',
          message: 'Logged out successfully',
          icon: 'fas fa-sign-out-alt'
        })
      }).
      catch((error) => {
        sessionToken.value = '' // Remove token even if it fails
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
      drawerTabs,
      username,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      logout
    }
  }
})
</script>
