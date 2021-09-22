<template>
  <q-input filled clearable v-model="textFieldValue" :label="label">
    <template v-slot:append>
      <q-icon name="access_time" class="cursor-pointer">
        <q-popup-proxy v-model="showPicker" transition-show="scale" transition-hide="scale">
          <q-datetime v-model="datetime" :label="label" @cancel="onCancel" @update:model-value="onSave" />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script lang="ts">
import QDatetime from 'components/QDatetime.vue';
import {
  defineComponent,
  PropType,
  computed,
  watch,
  ref,
  toRef,
  Ref,
} from 'vue';
import { DateTime } from 'luxon'

const DEFAULT_DATE_FORMAT = 'LLLL d, yyyy -'
const DEFAULT_TIME_FORMAT = 'h:mm a ZZZZ'
const DEFAULT_DATETIME_FORMAT = DEFAULT_DATE_FORMAT + ' ' + DEFAULT_TIME_FORMAT
const DEFAULT_CURRENT_DATE = DateTime.local().toISODate();

export default defineComponent({
  name: 'QDatetimeInput',
  components: { QDatetime },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],

  setup (props, { emit }) {
    const datetime = ref(props.modelValue)
    const showPicker = ref(false)

    const textFieldValue = computed({
      get: () => {
        if(datetime.value) {
          return DateTime.fromISO(datetime.value).toFormat(DEFAULT_DATETIME_FORMAT)
        } else {
          return ''
        }
      },
      set: (value) => {
        console.log(value)
        if (!value) {
          datetime.value = ''
          return
        }
        let luxonDatetime = DateTime.fromFormat(value, DEFAULT_DATETIME_FORMAT)
        console.log(luxonDatetime)
        console.log(luxonDatetime.invalid)
        console.log(luxonDatetime.invalid === null)
        if (luxonDatetime.invalid === null) {
          parseDatetime(luxonDatetime)
        }
      }
    })

    function parseDatetime(updatedDatetime) {
      if (updatedDatetime instanceof DateTime) {
        datetime.value = updatedDatetime.toISO()
      } else if (updatedDatetime instanceof Date) {
        datetime.value = DateTime.fromJSDate(updatedDatetime).toISO()
      } else if (typeof updatedDatetime === 'string' || updatedDatetime instanceof String) {
        datetime.value = updatedDatetime
      } else {
        datetime.value = null
      }
    }

    function onCancel() {
      showPicker.value = false
    }

    function onSave(updatedDatetime) {
      // console.log(updatedDatetime)
      showPicker.value = false
      datetime.value = updatedDatetime
      // parseDatetime(updatedDatetime)
    }

    watch(
      () => datetime.value,
      (newValue) => {
        emit('update:modelValue', newValue)
      }
    )

    watch(
      () => props.modelValue,
      (newValue) => {
        datetime.value = newValue
      }
    )

    return { textFieldValue, datetime, showPicker, onCancel, onSave }
  }
})
</script>
