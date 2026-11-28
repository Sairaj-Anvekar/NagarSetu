import { useAuthStore } from '../stores/auth'
import { getLoginRoute } from '../utils/loginRoute'

/**
 * Route guard enforcing authentication and role-based access.
 * Returns true if navigation is allowed, or a route location to redirect.
 *
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {boolean | string | { path: string, query?: Record<string, string> }}
 */
export function authGuard(to) {
  if (!to.meta?.requiresAuth) {
    return true
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    const isWorkerRoute = to.path === '/worker' || to.path?.startsWith('/worker/')
    if (isWorkerRoute) {
      return getLoginRoute({ role: 'worker', redirect: to.fullPath })
    }
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.role && auth.role !== to.meta.role) {
    return auth.isAdmin ? '/admin' : '/worker'
  }

  return true
}
