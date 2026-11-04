/**
 * Extract field-specific validation errors from an Axios / FastAPI error.
 *
 * When `error.response.data.detail` is an array of validation errors, each item's
 * field is taken from the last element of `loc` (e.g. ['body', 'phone'] -> 'phone')
 * and paired with `msg`.
 *
 * The first message per field wins. Items without a usable loc or msg are skipped.
 * Returns an empty object for any other shape (string detail, missing response,
 * null/undefined error). Never throws.
 *
 * @param {unknown} error
 * @returns {Record<string, string>}
 */
export function getFieldErrors(error) {
  const errors = {}

  try {
    const detail = error?.response?.data?.detail
    if (!Array.isArray(detail)) {
      return errors
    }

    for (const item of detail) {
      if (!item || typeof item !== 'object') continue

      const { loc, msg } = item
      if (typeof msg !== 'string' || !msg.trim()) continue
      if (!Array.isArray(loc) || loc.length === 0) continue

      const field = loc[loc.length - 1]
      if (typeof field !== 'string' || !field.trim()) continue

      if (errors[field] === undefined) {
        errors[field] = msg
      }
    }
  } catch {
    return {}
  }

  return errors
}

