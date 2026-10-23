import { useAuthStore } from '../stores/auth'

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
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.role && auth.role !== to.meta.role) {
    return auth.isAdmin ? '/admin' : '/worker'
  }

  return true
}
