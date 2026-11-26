<template>
  <q-dialog
    :model-value="modelValue"
    aria-labelledby="share-title"
    @update:model-value="(open: boolean) => emit('update:modelValue', open)"
  >
    <q-card v-if="view !== null" style="min-width: 320px">
      <q-card-section>
        <div id="share-title" class="text-h6">{{ $t('share.title') }}</div>
      </q-card-section>

      <q-card-section v-if="view.canInvite">
        <q-form class="q-gutter-sm" @submit="invite">
          <q-input
            v-model="username"
            :label="$t('share.username')"
            autocapitalize="off"
            :error="errors.fields.username !== undefined"
            :error-message="
              errors.fields.username === undefined ? undefined : $t(errors.fields.username)
            "
          />
          <q-option-group
            v-model="role"
            :options="roleOptions"
            inline
            :aria-label="$t('share.role')"
            role="radiogroup"
          />
          <div v-if="errors.form !== null" role="alert" class="text-negative">
            {{ $t(errors.form) }}
          </div>
          <div v-if="invited !== null" role="status" class="text-positive">
            {{ $t('share.invited', { username: invited }) }}
          </div>
          <q-btn
            type="submit"
            color="primary"
            :label="$t('share.invite')"
            :loading="busy"
            :disable="username.trim() === ''"
          />
        </q-form>
      </q-card-section>

      <q-card-section>
        <section :aria-label="$t('share.collaborators')">
          <div class="text-subtitle1">{{ $t('share.collaborators') }}</div>
          <q-list v-if="view.collaborators.length > 0" dense>
            <q-item v-for="row in view.collaborators" :key="row.grantId">
              <q-item-section>
                <q-item-label>
                  {{ row.you ? $t('share.you') : $t('share.someone') }}
                </q-item-label>
                <q-item-label caption>{{ $t(`share.roles.${row.role}`) }}</q-item-label>
              </q-item-section>
              <q-item-section v-if="row.removable" side>
                <q-btn
                  flat
                  dense
                  color="negative"
                  :label="$t('share.remove')"
                  :aria-label="$t('share.removeRole', { role: $t(`share.roles.${row.role}`) })"
                  @click="remove(row.grantId)"
                />
              </q-item-section>
            </q-item>
          </q-list>
          <p v-else class="text-grey">{{ $t('share.nobody') }}</p>
        </section>
        <div v-if="removeError !== null" role="alert" class="text-negative">
          {{ $t(removeError) }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="view.leaveGrantIds.length > 0"
          flat
          color="negative"
          :label="$t('share.leave')"
          @click="leave"
        />
        <q-btn v-close-popup flat :label="$t('share.close')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import type { ShareRole } from '@tdl/app-core';
import type { ShareTarget } from '@tdl/domain';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApp, useDevice } from '@/composables/useApp.ts';
import { shareView } from '@/display/sharing-display.ts';
import { formErrors, type FormErrors } from '@/forms/account-forms.ts';

const props = defineProps<{ modelValue: boolean; target: ShareTarget }>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; left: [] }>();

const { state, controller } = useApp();
const device = useDevice();
const { t } = useI18n();

const view = computed(() =>
  state.value.kind === 'ready' && device.value !== null
    ? shareView(device.value, state.value.me.userId, props.target)
    : null,
);

const roles: ShareRole[] = ['editor', 'commenter', 'viewer'];
const roleOptions = computed(() =>
  roles.map((value) => ({ value, label: t(`share.roles.${value}`) })),
);

const username = ref('');
const role = ref<ShareRole>('editor');
const busy = ref(false);
const invited = ref<string | null>(null);
const errors = ref<FormErrors>({ form: null, fields: {} });
const removeError = ref<string | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    username.value = '';
    invited.value = null;
    errors.value = { form: null, fields: {} };
    removeError.value = null;
  },
);

async function invite(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  invited.value = null;
  errors.value = { form: null, fields: {} };
  const name = username.value.trim();
  try {
    await controller.server().invite(props.target, name, role.value);
    invited.value = name;
    username.value = '';
  } catch (error) {
    errors.value = formErrors(error, ['username']);
  } finally {
    busy.value = false;
  }
}

/** Removes grants; the change reaches the device through the feed. */
async function removeGrants(grantIds: string[]): Promise<boolean> {
  removeError.value = null;
  try {
    for (const id of grantIds) await controller.server().removeGrant(id);
    return true;
  } catch (error) {
    removeError.value = formErrors(error, []).form;
    return false;
  }
}

async function remove(grantId: string): Promise<void> {
  await removeGrants([grantId]);
}

async function leave(): Promise<void> {
  if (view.value === null) return;
  if (!(await removeGrants(view.value.leaveGrantIds))) return;
  emit('update:modelValue', false);
  emit('left');
}
</script>
