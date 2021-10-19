<template>
  <div class="g-recaptcha" :data-sitekey="recaptchaSiteKey"></div>
  <p v-if="true">{{ recaptchaSiteKey }}</p>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  watch,
  ref,
  onBeforeMount,
} from 'vue';
// import { useQuasar } from 'quasar'
// import { useStore } from '../store'

export default defineComponent({
  name: 'QRecaptcha',
  props: {
    siteKey: {
      type: String,
      required: true
    }
  },
  // https://github.com/DanSnow/vue-recaptcha/blob/master/src/Recaptcha.js
  // https://v3.vuejs.org/api/composition-api.html#lifecycle-hooks
  setup(props) {
    onBeforeMount(
      () => {
        // Force rerender on hot reload by removing and re-adding script
        if(document.getElementById('recaptcha')) {
          // @ts-ignore
          document.getElementById('recaptcha').remove()
        }
        let script = document.createElement('script')
        script.setAttribute('id', 'recaptcha')
        script.setAttribute('src', 'https://www.google.com/recaptcha/api.js')
        document.head.appendChild(script)
      }
    )

    const recaptchaSiteKey = ref(props.siteKey)

    return { recaptchaSiteKey }
  },
});
</script>
