/**
 * Determines the initial login tab/role based on priority:
 * 1. (a) queryRole if it is 'worker' or 'admin'
 * 2. (b) redirectPath implied role:
 *    - '/admin' or starts with '/admin/' -> 'admin'
 *    - '/worker' or starts with '/worker/' -> 'worker'
 *    - (ignores anything not a string starting with '/')
 * 3. (c) rememberedRole if it is 'worker' or 'admin'
 * 4. (d) isStandalone boolean (true => 'worker')
 * 5. (e) fallback: 'admin'
 *
 * @param {string|{ queryRole?: string|null, redirectPath?: string|null, rememberedRole?: string|null, isStandalone?: boolean }|null} [queryRoleOrOptions]
 * @param {string|null} [maybeRedirectPathOrRememberedRole]
 * @param {string|boolean|null} [maybeRememberedRoleOrIsStandalone]
 * @param {boolean} [maybeIsStandalone=false]
 * @returns {'worker' | 'admin'}
 */
export function getInitialLoginRole(
  queryRoleOrOptions,
  maybeRedirectPathOrRememberedRole,
  maybeRememberedRoleOrIsStandalone,
  maybeIsStandalone = false,
) {
  let queryRole
  let redirectPath
  let rememberedRole
  let isStandalone

  if (queryRoleOrOptions && typeof queryRoleOrOptions === 'object') {
    queryRole = queryRoleOrOptions.queryRole
    redirectPath = queryRoleOrOptions.redirectPath
    rememberedRole = queryRoleOrOptions.rememberedRole
    isStandalone = queryRoleOrOptions.isStandalone ?? false
  } else {
    queryRole = queryRoleOrOptions

    // Support legacy 3-argument signature: (queryRole, rememberedRole, isStandalone)
    if (
      (maybeRedirectPathOrRememberedRole === 'worker' ||
        maybeRedirectPathOrRememberedRole === 'admin') &&
      typeof maybeRememberedRoleOrIsStandalone === 'boolean'
    ) {
      redirectPath = null
      rememberedRole = maybeRedirectPathOrRememberedRole
      isStandalone = maybeRememberedRoleOrIsStandalone
    } else {
      redirectPath = maybeRedirectPathOrRememberedRole
      rememberedRole = maybeRememberedRoleOrIsStandalone
      isStandalone = maybeIsStandalone ?? false
    }
  }

  // (a) route.query.role if 'worker' or 'admin'
  if (queryRole === 'worker' || queryRole === 'admin') {
    return queryRole
  }

  // (b) role implied by redirect path:
  // Must be a string starting with '/'
  // '/admin' or '/admin/...' -> 'admin'
  // '/worker' or '/worker/...' -> 'worker'
  if (typeof redirectPath === 'string' && redirectPath.startsWith('/')) {
    if (redirectPath === '/admin' || redirectPath.startsWith('/admin/')) {
      return 'admin'
    }
    if (redirectPath === '/worker' || redirectPath.startsWith('/worker/')) {
      return 'worker'
    }
  }

  // (c) remembered role
  if (rememberedRole === 'worker' || rememberedRole === 'admin') {
    return rememberedRole
  }

  // (d) standalone PWA -> 'worker'
  if (isStandalone) {
    return 'worker'
  }

  // (e) fallback 'admin'
  return 'admin'
}
