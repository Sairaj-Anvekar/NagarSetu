import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { loadAuth, clearAuth, saveAuth } from '../utils/authStorage'
import { loginAdmin as apiLoginAdmin, loginWorker as apiLoginWorker } from '../api/authApi'
import { setUnauthorizedHandler } from '../api/http'

const VALID_ROLES = ['admin', 'worker']

export const useAuthStore = defineStore('auth', () => {
  // -------------------------------------------------------------------------
  // State — initialised from localStorage via loadAuth()
  // -------------------------------------------------------------------------
  const stored = loadAuth()

  // If the stored role is not exactly 'admin' or 'worker' the session is
  // considered corrupted/invalid. Wipe storage and start logged out.
  const isValidSession = stored !== null && VALID_ROLES.includes(stored.role)

  if (stored !== null && !isValidSession) {
    clearAuth()
  }

  const token = ref(isValidSession ? stored.token : null)
  const role = ref(isValidSession ? stored.role : null)
  const user = ref(isValidSession ? stored.user : null)

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** True when the user holds a non-empty token. */
  const isAuthenticated = computed(() => typeof token.value === 'string' && token.value.length > 0)

  /** True when the authenticated user is an admin. */
  const isAdmin = computed(() => isAuthenticated.value && role.value === 'admin')

  /** True when the authenticated user is a worker. */
  const isWorker = computed(() => isAuthenticated.value && role.value === 'worker')

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /** Clear all auth state from memory and from localStorage. */
  function logout() {
    clearAuth()
    token.value = null
    role.value = null
    user.value = null
  }

  /**
   * Log in as admin. On success, persists the session and updates state.
   * On failure, leaves the store logged out and re-throws so the caller
   * can display the error with getErrorMessage.
   *
   * @param {{ username: string, password: string }} credentials
   */
  async function loginAdmin(credentials) {
    try {
      const auth = await apiLoginAdmin(credentials)
      token.value = auth.token
      role.value = auth.role
      user.value = auth.user
      saveAuth(auth)
    } catch (err) {
      // Ensure store stays logged out; storage is untouched
      token.value = null
      role.value = null
      user.value = null
      throw err
    }
  }

  /**
   * Log in as worker. On success, persists the session and updates state.
   * On failure, leaves the store logged out and re-throws.
   *
   * @param {{ phone: string, pin: string }} credentials
   */
  async function loginWorker(credentials) {
    try {
      const auth = await apiLoginWorker(credentials)
      token.value = auth.token
      role.value = auth.role
      user.value = auth.user
      saveAuth(auth)
    } catch (err) {
      token.value = null
      role.value = null
      user.value = null
      throw err
    }
  }

  return {
    // state
    token,
    role,
    user,
    // getters
    isAuthenticated,
    isAdmin,
    isWorker,
    // actions
    logout,
    loginAdmin,
    loginWorker,
  }
})

/**
 * Wire the http layer's 401 callback to the auth store.
 * Call this once in main.js after createPinia() and the router are both ready.
 * Keeping this outside the store prevents the store from importing the router
 * (which would create a circular dependency).
 *
 * @param {import('vue-router').Router} router
 */
export function registerUnauthorizedHandler(router) {
  setUnauthorizedHandler(() => {
    const auth = useAuthStore()
    auth.logout()
    router.push({ path: '/login', query: { reason: 'expired' } })
  })
}
