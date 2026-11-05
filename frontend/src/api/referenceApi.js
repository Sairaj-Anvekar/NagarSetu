// ASSUMED CONTRACT - confirm with the backend developer
import http from './http'

/**
 * Normalizes a raw department or zone option into a safe { id, name } pair.
 * Never throws.
 *
 * @param {unknown} raw
 * @returns {{ id: string, name: string }}
 */
export function normalizeOption(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '' }
  }

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : '',
    name: raw.name ?? '',
  }
}

/**
 * Fetches all municipal departments.
 *
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
export async function fetchDepartments() {
  const { data } = await http.get('/departments')

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return data.items.map(normalizeOption)
}

/**
 * Fetches all municipal zones.
 *
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
export async function fetchZones() {
  const { data } = await http.get('/zones')

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return data.items.map(normalizeOption)
}

