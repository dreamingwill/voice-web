import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/MainView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Login.vue'),
    },
    {
      path: '/admin/operators',
      name: 'admin-operators',
      component: () => import('@/pages/admin/Operators.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/commands',
      name: 'admin-commands',
      component: () => import('@/pages/admin/Commands.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/logs',
      name: 'admin-logs',
      component: () => import('@/pages/admin/Logs.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

export default router
