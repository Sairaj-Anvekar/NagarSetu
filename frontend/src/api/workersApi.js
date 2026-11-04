// ASSUMED CONTRACT - confirm with the backend developer
import http from './http'

/**
 * Normalizes a raw worker record from the API into a safe, consistent format.
 *
 * @param {unknown} raw
 * @returns {{ id: string, name: string, phone: string, department: string, zone: string, is_active: boolean }}
 */
export function normalizeWorker(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      phone: '',
      department: '',
      zone: '',
      is_active: false,
    }
  }

  let department = ''
  if (typeof raw.department === 'string') {
    department = raw.department
  } else if (raw.department && typeof raw.department === 'object' && typeof raw.department.name === 'string') {
    department = raw.department.name
  }

  let zone = ''
  if (typeof raw.zone === 'string') {
    zone = raw.zone
  } else if (raw.zone && typeof raw.zone === 'object' && typeof raw.zone.name === 'string') {
    zone = raw.zone.name
  }

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    department,
    zone,
    is_active: Boolean(raw.is_active),
  }
}

/**
 * Fetches all municipal workers for administrative management.
 *
 * @returns {Promise<{ items: Array<object>, total: number }>}
 */
export async function fetchWorkers() {
  const { data } = await http.get('/workers', { params: { page_size: 100 } })

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return {
    items: data.items.map(normalizeWorker),
    total: data.total ?? data.items.length,
  }
}

/**
 * Activates or deactivates a municipal worker.
 *
 * @param {string|number} id
 * @param {boolean} isActive
 * @returns {Promise<object>}
 */
export async function setWorkerActive(id, isActive) {
  const { data } = await http.patch('/workers/' + encodeURIComponent(id), {
    is_active: Boolean(isActive),
  })

  if (data && typeof data === 'object' && data.id !== undefined && data.id !== null) {
    return normalizeWorker(data)
  }

  return {
    id: String(id),
    is_active: Boolean(isActive),
  }
}

