import type { RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import CouldntSyncPage from '@/pages/CouldntSyncPage.vue';
import DevicesPage from '@/pages/DevicesPage.vue';
import ErrorNotFound from '@/pages/ErrorNotFound.vue';
import IndexPage from '@/pages/IndexPage.vue';
import InvitationsPage from '@/pages/InvitationsPage.vue';
import ListPage from '@/pages/ListPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import SignUpPage from '@/pages/SignUpPage.vue';
import TaskPage from '@/pages/TaskPage.vue';

// Pages are imported, not loaded when first opened, so that once the app has loaded every page
// opens offline too (docs/features/app/offline.md).
// Pages are open only when logged in, unless their meta says `public` (see guards.ts).
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      // The guard sends the home page to the user's default list.
      { path: '', component: IndexPage, meta: { home: true } },
      { path: 'lists/:listId', component: ListPage, props: true },
      { path: 'tasks/:taskId', component: TaskPage, props: true },
      { path: 'couldnt-sync', component: CouldntSyncPage },
      { path: 'invitations', component: InvitationsPage },
      { path: 'settings/devices', component: DevicesPage },
      // Only for logged-out users: the guard takes a logged-in user to their tasks.
      { path: 'login', component: LoginPage, meta: { public: true, guest: true } },
      { path: 'signup', component: SignUpPage, meta: { public: true, guest: true } },
    ],
  },

  // Always leave this as last one
  { path: '/:catchAll(.*)*', component: ErrorNotFound },
];

export default routes;
