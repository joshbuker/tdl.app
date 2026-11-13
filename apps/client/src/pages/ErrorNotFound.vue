<template>
  <div class="fullscreen text-center q-pa-md flex flex-center">
    <div>
      <div class="text-h4">{{ $t('notFound.message') }}</div>
      <q-btn
        class="q-mt-xl"
        color="primary"
        unelevated
        to="/"
        :label="$t('notFound.home')"
        no-caps
      />
    </div>
  </div>
</template>
