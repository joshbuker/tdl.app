<template>
  <q-page padding class="row justify-center">
    <q-form class="col-12 col-sm-8 col-md-5 q-gutter-md" @submit="submit">
      <h1 class="text-h5">{{ $t('signUp.title') }}</h1>
      <q-input
        v-model="form.username"
        :label="$t('signUp.username')"
        autocomplete="username"
        autocapitalize="off"
        v-bind="fieldError('username')"
      />
      <q-input
        v-model="form.email"
        type="email"
        :label="$t('signUp.email')"
        autocomplete="email"
        v-bind="fieldError('email')"
      />
      <q-input
        v-model="form.password"
        type="password"
        :label="$t('signUp.password')"
        autocomplete="new-password"
        v-bind="fieldError('password')"
      />
      <q-input
        v-model="form.givenName"
        :label="$t('signUp.givenName')"
        autocomplete="given-name"
        v-bind="fieldError('givenName')"
      />
      <q-input
        v-model="form.familyName"
        :label="$t('signUp.familyName')"
        autocomplete="family-name"
        v-bind="fieldError('familyName')"
      />
      <div>
        <q-checkbox v-model="form.acceptTerms" :label="$t('signUp.acceptTerms')" />
        <div v-if="errors.fields.acceptTerms !== undefined" class="text-negative text-caption">
          {{ $t(errors.fields.acceptTerms) }}
        </div>
      </div>
      <div v-if="errors.form !== null" role="alert" class="text-negative">
        {{ $t(errors.form) }}
      </div>
      <q-btn
        type="submit"
        color="primary"
        :label="$t('signUp.submit')"
        :loading="busy"
        :disable="!canSubmitAccountForm(state)"
      />
      <q-btn flat no-caps to="/login" :label="$t('signUp.toLogin')" />
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useApp } from '@/composables/useApp.ts';
import { canSubmitAccountForm, formErrors, type FormErrors } from '@/forms/account-forms.ts';

const FIELDS = ['username', 'email', 'password', 'givenName', 'familyName', 'acceptTerms'];

const { state, controller } = useApp();
const router = useRouter();
const { t } = useI18n();

const form = reactive({
  username: '',
  email: '',
  password: '',
  givenName: '',
  familyName: '',
  acceptTerms: false,
});
const busy = ref(false);
const errors = ref<FormErrors>({ form: null, fields: {} });

/** QInput's error props for a field. */
function fieldError(field: string): { error: boolean; errorMessage?: string } {
  const key = errors.value.fields[field];
  return key === undefined ? { error: false } : { error: true, errorMessage: t(key) };
}

async function submit(): Promise<void> {
  if (busy.value || !canSubmitAccountForm(state.value)) return;
  busy.value = true;
  errors.value = { form: null, fields: {} };
  try {
    await controller.signUp({ ...form });
    await router.push('/');
  } catch (error) {
    errors.value = formErrors(error, FIELDS);
  } finally {
    busy.value = false;
  }
}
</script>
