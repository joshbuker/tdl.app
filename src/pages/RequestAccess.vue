<template>
  <q-page class="row items-center justify-evenly">
    <q-card style="width: 500px;">
      <q-card-section class="bg-grey-8 text-white">
        <q-item>
          <q-item-section avatar>
            <q-icon name="fas fa-terminal" />
          </q-item-section>
          <q-item-section>
            <div class="text-h5">TDL App</div>
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" autofocus>
          <q-stepper
            v-model="step"
            vertical
            color="primary"
            animated
            flat
            header-nav
          >
            <q-step
              :name="1"
              title="Who are you?"
              icon="fas fa-question"
              :done="step > 1"
              :header-nav="step > 1"
            >
              <q-input
                v-model="name"
                filled
                :label="$t('name')"
                class="q-my-md"
              >
                <template v-slot:prepend>
                  <q-icon name="fas fa-user" />
                </template>
              </q-input>

              <q-input
                v-model="email"
                filled
                :label="$t('email')"
                type="email"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-stepper-navigation>
                <q-btn @click="step = 2" color="primary" label="Continue" />
              </q-stepper-navigation>
            </q-step>

            <q-step
              :name="2"
              :title="$t('reasonForInterest')"
              icon="fas fa-question"
              :done="step > 2"
              :header-nav="step > 2"
            >
              <q-input
                v-model="reasonForInterest"
                filled
                :label="$t('reasonForInterest')"
                type="textarea"
                class="q-my-md"
              >
                <template v-slot:prepend>
                  <q-icon name="help" />
                </template>
              </q-input>

              <q-stepper-navigation>
                <q-btn @click="step = 3" color="primary" label="Continue" />
                <q-btn flat @click="step = 1" color="primary" label="Back" class="q-ml-sm" />
              </q-stepper-navigation>
            </q-step>

            <q-step
              :name="3"
              title="When do you want in?"
              icon="far fa-clock"
              :done="step > 3"
              :header-nav="step > 3"
            >
              <q-list>
                <!--
                  Rendering a <label> tag (notice tag="label")
                  so QRadios will respond to clicks on QItems to
                  change Toggle state.
                -->

                <q-item tag="label" v-ripple>
                  <q-item-section avatar>
                    <q-radio v-model="color" val="teal" color="teal" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Alpha</q-item-label>
                    <q-item-label caption>
                      Razor sharp edges and sudden drops present, watch your step.
                      Not all features will be implemented yet, and things may break
                      horribly.
                      <br><br>
                      Only power users should consider this option.
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item tag="label" v-ripple>
                  <q-item-section avatar>
                    <q-radio v-model="color" val="orange" color="orange" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Beta</q-item-label>
                    <q-item-label caption>
                      All of the intended features will be implemented, but may
                      still be rough around the edges. Should be daily driver ready,
                      and we will be mostly looking for bugs and UI/UX improvements.
                      <br><br>
                      May not be polished, but anyone may consider this option.
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item tag="label" v-ripple>
                  <q-item-section avatar top>
                    <q-radio v-model="color" val="cyan" color="cyan" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Release</q-item-label>
                    <q-item-label caption>
                      For those seeking a truly polished TDL solution, and don't
                      have the time to deal with potential hiccups.
                      <br><br>
                      Anyone may consider this option.
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-stepper-navigation>
                <q-btn @click="step = 4" color="primary" label="Continue" />
                <q-btn flat @click="step = 2" color="primary" label="Back" class="q-ml-sm" />
              </q-stepper-navigation>
            </q-step>

            <q-step
              :name="4"
              title="Are you a robot?"
              icon="fas fa-robot"
              :done="step > 4"
              :header-nav="step > 4"
            >
              ReCAPTCHA box goes here

              <q-stepper-navigation>
                <q-btn color="primary" :label="$t('requestAccess')" />
                <q-btn flat @click="step = 3" color="primary" label="Back" class="q-ml-sm" />
              </q-stepper-navigation>
            </q-step>
          </q-stepper>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'PageRegister',

  preFetch({ store, redirect }) {
    const isAuthenticated =
      (
        store.state.authentication.sessionToken !== null &&
        store.state.authentication.sessionToken.length > 0
      )
    if (isAuthenticated) {
      redirect({ path: '/' })
    }
  },

  setup() {
    const step = ref(1)
    return { step };
  }
});
</script>
