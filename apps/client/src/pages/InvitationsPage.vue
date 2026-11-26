<template>
  <q-page padding>
    <h1 class="text-h5">{{ $t('invitations.title') }}</h1>
    <div v-if="error !== null" role="alert" class="text-negative">{{ $t(error) }}</div>
    <q-list v-if="invitations.length > 0" separator>
      <q-item v-for="invitation in invitations" :key="invitation.id">
        <q-item-section>
          <q-item-label>
            {{
              invitation.target.kind === 'list'
                ? $t('invitations.list', { inviter: invitation.inviter.username })
                : $t('invitations.task', { inviter: invitation.inviter.username })
            }}
          </q-item-label>
          <q-item-label caption>
            {{ $t('invitations.role', { role: $t(`share.roles.${invitation.role}`) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row q-gutter-sm">
            <q-btn
              flat
              :label="$t('invitations.decline')"
              :aria-label="$t('invitations.declineFrom', { inviter: invitation.inviter.username })"
              @click="decline(invitation)"
            />
            <q-btn
              color="primary"
              :label="$t('invitations.accept')"
              :aria-label="$t('invitations.acceptFrom', { inviter: invitation.inviter.username })"
              @click="accept(invitation)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <p v-else>{{ $t('invitations.empty') }}</p>
  </q-page>
</template>

<script setup lang="ts">
import type { Invitation } from '@tdl/app-core';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApp } from '@/composables/useApp.ts';
import { useInvitations } from '@/composables/useInvitations.ts';
import { formErrors } from '@/forms/account-forms.ts';

const { state, controller } = useApp();
const router = useRouter();
const { invitations, refresh } = useInvitations(controller);
const error = ref<string | null>(null);

onMounted(refresh);

/** Accepts, then syncs so the shared list or task is on the device, and opens it. */
async function accept(invitation: Invitation): Promise<void> {
  error.value = null;
  try {
    await controller.server().acceptInvitation(invitation.id);
  } catch (failure) {
    error.value = formErrors(failure, []).form;
    await refresh();
    return;
  }
  if (state.value.kind === 'ready') await state.value.replica.sync();
  await refresh();
  const { kind, id } = invitation.target;
  await router.push(kind === 'list' ? `/lists/${id}` : `/tasks/${id}`);
}

async function decline(invitation: Invitation): Promise<void> {
  error.value = null;
  try {
    await controller.server().declineInvitation(invitation.id);
  } catch (failure) {
    error.value = formErrors(failure, []).form;
  }
  await refresh();
}
</script>
