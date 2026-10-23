/**
 * Validate and sanitize redirect paths to prevent open redirect vulnerabilities.
 * Only allows safe internal relative paths, excluding the login route itself.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function getSafeRedirect(value) {
  if (typeof value !== 'string') {
    return null
  }

  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.startsWith('/login')
  ) {
    return null
  }

  return value
}
