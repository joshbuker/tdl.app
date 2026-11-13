<template>
  <!-- Seamless and without taking focus: the page underneath stays usable. -->
  <q-dialog
    :model-value="modelValue"
    seamless
    persistent
    no-focus
    allow-focus-outside
    position="bottom"
    aria-labelledby="session-ended-title"
  >
    <q-card style="min-width: 320px">
      <q-form @submit="submit">
        <q-card-section>
          <div id="session-ended-title" class="text-h6">{{ $t('sessionEnded.title') }}</div>
          <p class="q-mb-none">{{ $t('sessionEnded.message') }}</p>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="identifier"
            dense
            :label="$t('login.identifier')"
            autocomplete="username"
            autocapitalize="off"
          />
          <q-input
            v-model="password"
            dense
            type="password"
            :label="$t('login.password')"
            autocomplete="current-password"
          />
          <div v-if="errors.form !== null" role="alert" class="text-negative">
            {{ $t(errors.form) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('sessionEnded.logOut')" @click="emit('logOut')" />
          <q-btn type="submit" color="primary" :label="$t('sessionEnded.submit')" :loading="busy" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useApp } from '@/composables/useApp.ts';
import { formErrors, type FormErrors } from '@/forms/account-forms.ts';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ logOut: [] }>();

const { controller } = useApp();

const identifier = ref('');
const password = ref('');
const busy = ref(false);
const errors = ref<FormErrors>({ form: null, fields: {} });

async function submit(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  errors.value = { form: null, fields: {} };
  try {
    await controller.logInAgain(identifier.value, password.value);
    password.value = '';
  } catch (error) {
    errors.value = formErrors(error, []);
  } finally {
    busy.value = false;
  }
}
</script>
