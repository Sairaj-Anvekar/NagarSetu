/**
 * Resolves the appropriate login route location object based on the user's role,
 * current path fallback, and any query options (e.g. reason for logout or safe redirect).
 *
 * Rules:
 * - Role 'admin': returns path '/login', adding query parameters only if provided (e.g. reason: 'expired').
 * - Role 'worker': returns path '/login' with query.role = 'worker', plus any additional query params.
 * - Missing/undetermined role:
 *     - If currentPath starts with '/admin', falls back to admin login.
 *     - If currentPath starts with '/worker', falls back to worker login.
 *     - Otherwise, falls back to worker login.
 *
 * @param {{ role?: string|null, currentPath?: string|{ path?: string }|null, reason?: string|null, redirect?: string|null }|string|null} [roleOrOptions]
 * @param {{ currentPath?: string|{ path?: string }|null, reason?: string|null, redirect?: string|null }} [maybeOptions]
 * @returns {{ path: string, query?: Record<string, string> }}
 */
export function getLoginRoute(roleOrOptions, maybeOptions = {}) {
  let options = {}
  if (typeof roleOrOptions === 'string' || roleOrOptions === null) {
    options = { ...maybeOptions, role: roleOrOptions }
  } else if (roleOrOptions && typeof roleOrOptions === 'object') {
    options = { ...roleOrOptions, ...maybeOptions }
  }

  const { role, reason, redirect } = options

  const currentPathStr =
    typeof options.currentPath === 'string'
      ? options.currentPath
      : options.currentPath?.path || ''

  let effectiveRole = role
  if (!effectiveRole) {
    if (currentPathStr.startsWith('/admin')) {
      effectiveRole = 'admin'
    } else if (currentPathStr.startsWith('/worker')) {
      effectiveRole = 'worker'
    } else {
      effectiveRole = 'worker'
    }
  }

  const query = {}
  if (effectiveRole === 'worker') {
    query.role = 'worker'
  }
  if (reason) {
    query.reason = reason
  }
  if (redirect) {
    query.redirect = redirect
  }

  if (Object.keys(query).length > 0) {
    return { path: '/login', query }
  }

  return { path: '/login' }
}
