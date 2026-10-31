import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import WorkerView from '../views/WorkerView.vue'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/worker',
      name: 'worker',
      component: WorkerView,
      meta: { requiresAuth: true, role: 'worker' },
    },
  ],
})

router.beforeEach(authGuard)

if (import.meta.env.DEV) {
  router.addRoute({
    path: '/design',
    name: 'design',
    component: () => import('../views/DesignSystemView.vue'),
  })
}

export default router