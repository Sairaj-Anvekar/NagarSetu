import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import AdminWorkersView from '../views/AdminWorkersView.vue'
import AdminWorkerCreateView from '../views/AdminWorkerCreateView.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import WorkerLayout from '../components/worker/WorkerLayout.vue'
import WorkerView from '../views/WorkerView.vue'
import WorkerHistoryView from '../views/WorkerHistoryView.vue'
import WorkerAccountView from '../views/WorkerAccountView.vue'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'admin', noNavbar: true },
      children: [
        { path: '', name: 'admin', component: AdminView },
        { path: 'workers', name: 'admin-workers', component: AdminWorkersView },
        { path: 'workers/new', name: 'admin-worker-new', component: AdminWorkerCreateView },
      ],
    },
    {
      path: '/worker',
      component: WorkerLayout,
      meta: { requiresAuth: true, role: 'worker', noNavbar: true },
      children: [
        { path: '', name: 'worker', component: WorkerView },
        { path: 'history', name: 'worker-history', component: WorkerHistoryView },
        { path: 'account', name: 'worker-account', component: WorkerAccountView },
      ],
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
