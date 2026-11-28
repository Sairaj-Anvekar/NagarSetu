import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import WorkerLayout from '../components/worker/WorkerLayout.vue'
import WorkerView from '../views/WorkerView.vue'
import WorkerTaskDetailView from '../views/WorkerTaskDetailView.vue'
import WorkerHistoryView from '../views/WorkerHistoryView.vue'
import WorkerAccountView from '../views/WorkerAccountView.vue'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView, meta: { noNavbar: true } },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'admin', noNavbar: true },
      children: [
        { path: '', name: 'admin', component: () => import('../views/AdminView.vue') },
        {
          path: 'complaints',
          name: 'admin-complaints',
          component: () => import('../views/AdminComplaintsView.vue'),
        },
        {
          path: 'complaints/:id',
          name: 'admin-complaint-detail',
          component: () => import('../views/AdminComplaintDetailView.vue'),
        },
        {
          path: 'triage',
          name: 'admin-triage',
          component: () => import('../views/AdminTriageView.vue'),
        },
        {
          path: 'hotspots',
          name: 'admin-hotspots',
          component: () => import('../views/AdminHotspotsView.vue'),
        },
        {
          path: 'workers',
          name: 'admin-workers',
          component: () => import('../views/AdminWorkersView.vue'),
        },
        {
          path: 'workers/new',
          name: 'admin-worker-new',
          component: () => import('../views/AdminWorkerCreateView.vue'),
        },
      ],
    },
    {
      path: '/worker',
      component: WorkerLayout,
      meta: { requiresAuth: true, role: 'worker', noNavbar: true },
      children: [
        { path: '', name: 'worker', component: WorkerView },
        {
          path: 'tasks/:id',
          name: 'worker-task-detail',
          component: WorkerTaskDetailView,
          meta: { hideTabBar: true, hideAppBar: true },
        },
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
