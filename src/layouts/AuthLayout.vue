<template>
  <q-layout view="hHh Lpr lff">
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
      get: () => $store.state.settings.sessionToken,
      set: value => {
        $store.commit('settings/setSessionToken', value)
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
