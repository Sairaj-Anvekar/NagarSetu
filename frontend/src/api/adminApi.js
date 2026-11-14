import http from './http'

/**
 * Normalizes the raw stats payload from the API into a safe, consistent structure.
 * Missing numbers default to 0, missing arrays default to [].
 *
 * @param {unknown} raw
 * @returns {{
 *   department: { id: string, name: string },
 *   totals: {
 *     total: number,
 *     submitted: number,
 *     in_progress: number,
 *     completed: number,
 *     overdue: number,
 *     unassigned: number
 *   },
 *   by_category: Array<{ category: string, count: number }>,
 *   by_zone: Array<{ zone: string, count: number }>,
 *   pending_triage: number
 * }}
 */
export function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      department: { id: '', name: '' },
      totals: {
        total: 0,
        submitted: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        unassigned: 0,
      },
      by_category: [],
      by_zone: [],
      pending_triage: 0,
    }
  }

  const dept = raw.department && typeof raw.department === 'object' ? raw.department : {}
  const rawTotals = raw.totals && typeof raw.totals === 'object' ? raw.totals : {}

  const byCategory = Array.isArray(raw.by_category)
    ? raw.by_category.map((item) => ({
        category: typeof item?.category === 'string' ? item.category : '',
        count: typeof item?.count === 'number' && !Number.isNaN(item.count) ? item.count : 0,
      }))
    : []

  const byZone = Array.isArray(raw.by_zone)
    ? raw.by_zone.map((item) => ({
        zone: typeof item?.zone === 'string' ? item.zone : '',
        count: typeof item?.count === 'number' && !Number.isNaN(item.count) ? item.count : 0,
      }))
    : []

  return {
    department: {
      id: dept.id !== undefined && dept.id !== null ? String(dept.id) : '',
      name: typeof dept.name === 'string' ? dept.name : '',
    },
    totals: {
      total:
        typeof rawTotals.total === 'number' && !Number.isNaN(rawTotals.total)
          ? rawTotals.total
          : 0,
      submitted:
        typeof rawTotals.submitted === 'number' && !Number.isNaN(rawTotals.submitted)
          ? rawTotals.submitted
          : 0,
      in_progress:
        typeof rawTotals.in_progress === 'number' && !Number.isNaN(rawTotals.in_progress)
          ? rawTotals.in_progress
          : 0,
      completed:
        typeof rawTotals.completed === 'number' && !Number.isNaN(rawTotals.completed)
          ? rawTotals.completed
          : 0,
      overdue:
        typeof rawTotals.overdue === 'number' && !Number.isNaN(rawTotals.overdue)
          ? rawTotals.overdue
          : 0,
      unassigned:
        typeof rawTotals.unassigned === 'number' && !Number.isNaN(rawTotals.unassigned)
          ? rawTotals.unassigned
          : 0,
    },
    by_category: byCategory,
    by_zone: byZone,
    pending_triage:
      typeof raw.pending_triage === 'number' && !Number.isNaN(raw.pending_triage)
        ? raw.pending_triage
        : 0,
  }
}

/**
 * Fetches department grievance statistics for the admin dashboard.
 *
 * @returns {Promise<ReturnType<typeof normalizeStats>>}
 */
export async function fetchStats() {
  const { data } = await http.get('/admin/stats')
  return normalizeStats(data)
}

/**
 * Fetches grievance volume trend data over a specified number of days.
 *
 * @param {{ days?: number }} [options]
 * @returns {Promise<Array<{ date: string, created: number, completed: number }>>}
 */
export async function fetchTrends({ days = 14 } = {}) {
  const { data } = await http.get('/admin/trends', { params: { days } })

  if (!Array.isArray(data)) {
    throw new Error('Unexpected response from the server')
  }

  return data.map((point) => ({
    date: typeof point?.date === 'string' ? point.date : '',
    created:
      typeof point?.created === 'number' && !Number.isNaN(point.created) ? point.created : 0,
    completed:
      typeof point?.completed === 'number' && !Number.isNaN(point.completed)
        ? point.completed
        : 0,
  }))
}

/**
 * Fetches the paginated list of department grievances for administrative review.
 *
 * @param {{
 *   status?: string,
 *   category?: string,
 *   zoneId?: string | number,
 *   overdue?: boolean,
 *   unassigned?: boolean,
 *   q?: string,
 *   page?: number,
 *   pageSize?: number
 * }} [filters]
 * @returns {Promise<{ items: Array<object>, total: number, page: number, pageSize: number }>}
 */
export async function fetchAdminComplaints({
  status,
  category,
  zoneId,
  overdue,
  unassigned,
  q,
  page,
  pageSize,
} = {}) {
  const params = {}

  if (status) {
    params.status = status
  }
  if (category) {
    params.category = category
  }
  if (zoneId !== undefined && zoneId !== null && zoneId !== '') {
    params.zone_id = zoneId
  }
  if (overdue === true) {
    params.overdue = true
  }
  if (unassigned === true) {
    params.unassigned = true
  }
  if (typeof q === 'string' && q.trim() !== '') {
    params.q = q.trim()
  }
  if (page !== undefined && page !== null && page !== '') {
    params.page = page
  }
  if (pageSize !== undefined && pageSize !== null && pageSize !== '') {
    params.page_size = pageSize
  }

  const { data } = await http.get('/admin/complaints', { params })

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return {
    items: data.items,
    total: typeof data.total === 'number' ? data.total : data.items.length,
    page: typeof data.page === 'number' ? data.page : (page ?? 1),
    pageSize: typeof data.page_size === 'number' ? data.page_size : (pageSize ?? 20),
  }
}

