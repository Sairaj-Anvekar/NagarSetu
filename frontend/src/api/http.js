import axios from 'axios'
import { getToken } from '../utils/authStorage'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
})

// ---------------------------------------------------------------------------
// Unauthorised handler
// ---------------------------------------------------------------------------
// A module-level variable that holds a callback to invoke when the server
// returns 401. Stored here (not imported from a store) to avoid circular
// imports. The Pinia auth store will register itself via setUnauthorizedHandler
// once it is ready.
let unauthorizedHandler = null

/**
 * Register a callback that will be called once when a 401 response is
 * received (and skipAuthRedirect is not set on the request config).
 * Pass null to remove a previously registered handler.
 *
 * @param {Function|null} fn
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Response interceptor — handle 401
// ---------------------------------------------------------------------------
http.interceptors.response.use(
  // Successful response: pass straight through
  (response) => response,

  // Error response
  (error) => {
    const status = error?.response?.status
    const skipAuthRedirect = error?.config?.skipAuthRedirect

    if (status === 401 && !skipAuthRedirect && unauthorizedHandler) {
      unauthorizedHandler()
    }

    // Always re-reject so callers can handle the error themselves
    return Promise.reject(error)
  },
)

export default http