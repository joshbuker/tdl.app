import type { RouteRecordRaw } from 'vue-router';

// Pages are open only when logged in, unless their meta says `public` (see guards.ts).
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') },
      { path: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
      { path: 'signup', component: () => import('@/pages/SignUpPage.vue'), meta: { public: true } },
    ],
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
