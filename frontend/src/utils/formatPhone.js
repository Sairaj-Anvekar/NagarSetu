/**
 * Formats a 10-digit Indian mobile number with a +91 prefix into a readable format (+91 XXXXX XXXXX).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatPhone(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const match = value.match(/^\+91(\d{5})(\d{5})$/)
  if (match) {
    return `+91 ${match[1]} ${match[2]}`
  }

  return value
}

