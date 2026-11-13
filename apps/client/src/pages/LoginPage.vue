<template>
  <q-page padding class="row justify-center">
    <q-form class="col-12 col-sm-8 col-md-5 q-gutter-md" @submit="submit">
      <h1 class="text-h5">{{ $t('login.title') }}</h1>
      <q-input
        v-model="identifier"
        :label="$t('login.identifier')"
        autocomplete="username"
        autocapitalize="off"
      />
      <q-input
        v-model="password"
        type="password"
        :label="$t('login.password')"
        autocomplete="current-password"
      />
      <div v-if="errors.form !== null" role="alert" class="text-negative">
        {{ $t(errors.form) }}
      </div>
      <q-btn
        type="submit"
        color="primary"
        :label="$t('login.submit')"
        :loading="busy"
        :disable="!canSubmitAccountForm(state)"
      />
      <q-btn flat no-caps to="/signup" :label="$t('login.toSignUp')" />
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApp } from '@/composables/useApp.ts';
import { canSubmitAccountForm, formErrors, type FormErrors } from '@/forms/account-forms.ts';

const { state, controller } = useApp();
const router = useRouter();

const identifier = ref('');
const password = ref('');
const busy = ref(false);
const errors = ref<FormErrors>({ form: null, fields: {} });

async function submit(): Promise<void> {
  if (busy.value || !canSubmitAccountForm(state.value)) return;
  busy.value = true;
  errors.value = { form: null, fields: {} };
  try {
    await controller.logIn(identifier.value, password.value);
    await router.push('/');
  } catch (error) {
    errors.value = formErrors(error, []);
  } finally {
    busy.value = false;
  }
}
</script>
