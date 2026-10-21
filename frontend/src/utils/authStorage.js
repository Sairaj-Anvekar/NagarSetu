const STORAGE_KEY = 'nagarsetu_auth'

/**
 * Persist auth data to localStorage.
 * @param {{ token: string, role: string, user: object }} auth
 */
export function saveAuth({ token, role, user }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role, user }))
  } catch {
    // localStorage unavailable or blocked — fail silently
  }
}

/**
 * Load auth data from localStorage.
 * Returns the parsed object, or null if:
 *   - nothing is stored
 *   - the stored text is not valid JSON
 *   - the parsed object has no token
 * Never throws.
 */
export function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.token) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Remove auth data from localStorage.
 */
export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // fail silently
  }
}

/**
 * Read the stored token directly from localStorage on every call.
 * No in-memory caching — always reflects the current stored value.
 * Returns the token string, or null if not present.
 */
export function getToken() {
  const auth = loadAuth()
  return auth ? auth.token : null
}
