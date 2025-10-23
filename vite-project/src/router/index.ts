import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/MainView.vue'),
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
    },
    {
      path: '/admin/logs',
      name: 'admin-logs',
      component: () => import('@/pages/admin/Logs.vue'),
    },
  ],
})

export default router
