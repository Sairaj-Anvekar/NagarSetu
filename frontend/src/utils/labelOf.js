/**
 * Safely extracts a display label from a plain string or an object with a `name` property.
 *
 * @param {unknown} value - Value to extract a label from.
 * @param {string} [fallback=''] - Fallback string if value is null, undefined, empty, or unresolvable.
 * @returns {string} Trimmed label or fallback.
 */
export function labelOf(value, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : fallback
  }

  if (value && typeof value === 'object' && typeof value.name === 'string') {
    const trimmedName = value.name.trim()
    return trimmedName ? trimmedName : fallback
  }

  return fallback
}
