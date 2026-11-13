import http from './http'

/**
 * Fetch assigned grievance tasks for the currently authenticated worker.
 *
 * @returns {Promise<{ items: Array<object>, total: number, page: number, page_size: number }>}
 */
export async function fetchMyTasks() {
  const { data } = await http.get('/workers/me/tasks')

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return {
    items: data.items,
    total: data.total ?? data.items.length,
    page: data.page ?? 1,
    page_size: data.page_size ?? data.items.length
  }
}

/**
 * Fetch completed grievance history for the currently authenticated worker.
 *
 * @param {{ page?: number, pageSize?: number }} [options]
 * @returns {Promise<{ items: Array<object>, total: number, page: number, pageSize: number }>}
 */
export async function fetchMyHistory({ page, pageSize } = {}) {
  const params = {}
  if (page !== undefined) {
    params.page = page
  }
  if (pageSize !== undefined) {
    params.page_size = pageSize
  }

  const { data } = await http.get('/workers/me/history', { params })

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return {
    items: data.items,
    total: data.total ?? data.items.length,
    page: data.page ?? page ?? 1,
    pageSize: data.page_size ?? pageSize ?? data.items.length
  }
}
