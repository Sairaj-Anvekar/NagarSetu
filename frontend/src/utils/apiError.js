/**
 * Extract a human-readable error message from an Axios error.
 *
 * Priority order:
 *  a. error.response.data.detail is a non-empty string  → return it as-is
 *  b. detail is an array                                 → join msg values with ", "
 *  c. Known HTTP status codes (401, 403, 404, 429, 5xx) → fixed message
 *  d. No response at all (network / timeout)             → connection message
 *  e. Anything else                                      → fallback
 *
 * Never throws, even if `error` is undefined.
 *
 * @param {unknown} error
 * @param {string}  [fallback]
 * @returns {string}
 */
export function getErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  try {
    const response = error?.response

    // a & b — FastAPI detail field
    const detail = response?.data?.detail
    if (detail) {
      if (typeof detail === 'string' && detail.length > 0) {
        return detail
      }
      if (Array.isArray(detail)) {
        const msgs = detail.map((item) => item?.msg).filter(Boolean)
        if (msgs.length > 0) return msgs.join(', ')
      }
    }

    // c — known HTTP status codes
    const status = response?.status
    if (status !== undefined) {
      if (status === 401) return 'Your session has expired. Please log in again.'
      if (status === 403) return 'You do not have permission to do this.'
      if (status === 404) return 'The requested item was not found.'
      if (status === 429) return 'Too many requests. Please wait a moment and try again.'
      if (status >= 500) return 'Server error. Please try again later.'
    }

    // d — no response (network error or timeout)
    // Axios always sets error.request when the request was actually sent
    // but no response came back, so this distinguishes real network errors
    // from completely unrecognised error shapes.
    if (error?.request && !response) {
      return 'Cannot reach the server. Check your connection.'
    }
  } catch {
    // If anything above throws unexpectedly, fall through to the default
  }

  // e — fallback
  return fallback
}
