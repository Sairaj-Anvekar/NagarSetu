export function makeMockToken(role, id) {
  return `mock-token-${role}-${id}`
}

export function readMockSession(headers) {
  if (!headers) {
    return null
  }

  const authHeader =
    typeof headers.get === 'function'
      ? headers.get('Authorization')
      : headers.Authorization || headers.authorization

  if (typeof authHeader !== 'string') {
    return null
  }

  const match = authHeader.trim().match(/^Bearer\s+mock-token-([a-zA-Z0-9_-]+)-([a-zA-Z0-9_-]+)$/)
  if (!match) {
    return null
  }

  return {
    role: match[1],
    id: match[2]
  }
}

export function normalizePhone(value) {
  if (typeof value !== 'string') {
    return value
  }

  const stripped = value.replace(/\s+/g, '')
  if (/^\d{10}$/.test(stripped)) {
    return `+91${stripped}`
  }

  return stripped
}
