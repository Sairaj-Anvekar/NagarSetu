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

/**
 * Normalizes raw complaint detail data from the server into a predictable shape
 * with safe defaults for missing objects, lists, and numbers.
 *
 * @param {unknown} raw
 * @returns {{
 *   id: string,
 *   tracking_code: string,
 *   category: string,
 *   status: string,
 *   priority: string,
 *   zone: { id: string, name: string } | null,
 *   assigned_worker: { id: string, name: string } | null,
 *   description: string,
 *   sla_deadline: string,
 *   is_overdue: boolean,
 *   created_at: string,
 *   resolved_at: string | null,
 *   image_url: string | null,
 *   latitude: number | null,
 *   longitude: number | null,
 *   carry_forward_count: number,
 *   logs: Array<{ event_type: string, actor_type: string, created_at: string, details: object | null }>,
 *   resolution: {
 *     note: string,
 *     photo_url: string | null,
 *     completed_at: string,
 *     worker: { id: string, name: string }
 *   } | null
 * }}
 */
export function normalizeAdminComplaint(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      tracking_code: '',
      category: '',
      status: '',
      priority: '',
      zone: null,
      assigned_worker: null,
      description: '',
      sla_deadline: '',
      is_overdue: false,
      created_at: '',
      resolved_at: null,
      image_url: null,
      latitude: null,
      longitude: null,
      carry_forward_count: 0,
      logs: [],
      resolution: null,
    }
  }

  const zone =
    raw.zone && typeof raw.zone === 'object'
      ? {
          id: raw.zone.id !== undefined && raw.zone.id !== null ? String(raw.zone.id) : '',
          name: typeof raw.zone.name === 'string' ? raw.zone.name : '',
        }
      : null

  const assignedWorker =
    raw.assigned_worker && typeof raw.assigned_worker === 'object'
      ? {
          id:
            raw.assigned_worker.id !== undefined && raw.assigned_worker.id !== null
              ? String(raw.assigned_worker.id)
              : '',
          name: typeof raw.assigned_worker.name === 'string' ? raw.assigned_worker.name : '',
        }
      : null

  const logs = Array.isArray(raw.logs)
    ? raw.logs.map((log) => ({
        event_type: typeof log?.event_type === 'string' ? log.event_type : '',
        actor_type: typeof log?.actor_type === 'string' ? log.actor_type : '',
        created_at: typeof log?.created_at === 'string' ? log.created_at : '',
        details: log?.details && typeof log.details === 'object' ? log.details : null,
      }))
    : []

  let resolution = null
  if (raw.resolution && typeof raw.resolution === 'object') {
    const resWorker =
      raw.resolution.worker && typeof raw.resolution.worker === 'object'
        ? {
            id:
              raw.resolution.worker.id !== undefined && raw.resolution.worker.id !== null
                ? String(raw.resolution.worker.id)
                : '',
            name:
              typeof raw.resolution.worker.name === 'string' ? raw.resolution.worker.name : '',
          }
        : { id: '', name: '' }

    resolution = {
      note: typeof raw.resolution.note === 'string' ? raw.resolution.note : '',
      photo_url: typeof raw.resolution.photo_url === 'string' ? raw.resolution.photo_url : null,
      completed_at:
        typeof raw.resolution.completed_at === 'string' ? raw.resolution.completed_at : '',
      worker: resWorker,
    }
  }

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : '',
    tracking_code: typeof raw.tracking_code === 'string' ? raw.tracking_code : '',
    category: typeof raw.category === 'string' ? raw.category : '',
    status: typeof raw.status === 'string' ? raw.status : '',
    priority: typeof raw.priority === 'string' ? raw.priority : '',
    zone,
    assigned_worker: assignedWorker,
    description: typeof raw.description === 'string' ? raw.description : '',
    sla_deadline: typeof raw.sla_deadline === 'string' ? raw.sla_deadline : '',
    is_overdue: Boolean(raw.is_overdue),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
    resolved_at: typeof raw.resolved_at === 'string' ? raw.resolved_at : null,
    image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
    latitude: typeof raw.latitude === 'number' && !Number.isNaN(raw.latitude) ? raw.latitude : null,
    longitude:
      typeof raw.longitude === 'number' && !Number.isNaN(raw.longitude) ? raw.longitude : null,
    carry_forward_count:
      typeof raw.carry_forward_count === 'number' && !Number.isNaN(raw.carry_forward_count)
        ? raw.carry_forward_count
        : 0,
    logs,
    resolution,
  }
}

/**
 * Fetches single complaint details for administrative review by complaint ID.
 *
 * @param {string} id - UUID of the complaint
 * @returns {Promise<ReturnType<typeof normalizeAdminComplaint>>}
 */
export async function fetchAdminComplaint(id) {
  if (!id) {
    throw new Error('A complaint ID must be provided')
  }

  const { data } = await http.get(`/admin/complaints/${encodeURIComponent(id)}`)

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response from the server')
  }

  return normalizeAdminComplaint(data)
}

/**
 * Requests a CSV export of department grievances matching the active filter criteria.
 * Sends an authenticated GET request with responseType: 'blob'.
 *
 * @param {{
 *   status?: string,
 *   category?: string,
 *   zoneId?: string | number,
 *   overdue?: boolean,
 *   unassigned?: boolean,
 *   q?: string
 * }} [filters]
 * @returns {Promise<Blob>} The CSV data blob
 */
export async function exportAdminComplaintsCsv({
  status,
  category,
  zoneId,
  overdue,
  unassigned,
  q,
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

  const { data } = await http.get('/admin/complaints/export', {
    params,
    responseType: 'blob',
  })

  if (data instanceof Blob) {
    return data
  }

  return new Blob([data], { type: 'text/csv;charset=utf-8' })
}

/**
 * Normalizes a raw hotspot item into a safe, consistent representation.
 *
 * @param {unknown} item
 * @param {number} [index]
 * @param {string} [fallbackCategory]
 * @returns {{ id: string, lat: number, lng: number, count: number, label: string, category: string }}
 */
export function normalizeHotspotItem(item, index = 0, fallbackCategory = '') {
  if (!item || typeof item !== 'object') {
    return {
      id: `hotspot-${index + 1}`,
      lat: 0,
      lng: 0,
      count: 0,
      label: `Hotspot ${index + 1}`,
      category: fallbackCategory || '',
    }
  }

  const lat =
    typeof item.lat === 'number' && !Number.isNaN(item.lat)
      ? item.lat
      : typeof item.latitude === 'number' && !Number.isNaN(item.latitude)
        ? item.latitude
        : 0

  const lng =
    typeof item.lng === 'number' && !Number.isNaN(item.lng)
      ? item.lng
      : typeof item.longitude === 'number' && !Number.isNaN(item.longitude)
        ? item.longitude
        : 0

  const count =
    typeof item.count === 'number' && !Number.isNaN(item.count) && item.count >= 0 ? item.count : 0

  const id =
    item.id !== undefined && item.id !== null && String(item.id).trim() !== ''
      ? String(item.id)
      : lat !== 0 || lng !== 0
        ? `${lat}_${lng}`
        : `hotspot-${index + 1}`

  const label =
    typeof item.label === 'string' && item.label.trim() !== ''
      ? item.label.trim()
      : typeof item.area_label === 'string' && item.area_label.trim() !== ''
        ? item.area_label.trim()
        : `Hotspot ${index + 1}`

  const category =
    typeof item.category === 'string' && item.category.trim() !== ''
      ? item.category.trim()
      : fallbackCategory || ''

  return {
    id,
    lat,
    lng,
    count,
    label,
    category,
  }
}

/**
 * Fetches complaint hotspot clusters for department geographic analysis.
 *
 * @param {{ days?: number, category?: string }} [filters]
 * @returns {Promise<{ items: Array<{ id: string, lat: number, lng: number, count: number, label: string, category: string }> }>}
 */
export async function fetchHotspots({ days, category } = {}) {
  const params = {}

  if (days !== undefined && days !== null && days !== '') {
    params.days = days
  }
  if (typeof category === 'string' && category.trim() !== '') {
    params.category = category.trim()
  }

  const { data } = await http.get('/admin/hotspots', { params })

  const rawList = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null
  if (!rawList) {
    throw new Error('Unexpected response from the server')
  }

  const fallbackCategory =
    typeof category === 'string' && category.trim() !== '' ? category.trim() : ''

  const extracted = rawList.map((raw) => {
    const lat =
      typeof raw?.lat === 'number' && !Number.isNaN(raw.lat)
        ? raw.lat
        : typeof raw?.latitude === 'number' && !Number.isNaN(raw.latitude)
          ? raw.latitude
          : 0

    const lng =
      typeof raw?.lng === 'number' && !Number.isNaN(raw.lng)
        ? raw.lng
        : typeof raw?.longitude === 'number' && !Number.isNaN(raw.longitude)
          ? raw.longitude
          : 0

    const count =
      typeof raw?.count === 'number' && !Number.isNaN(raw.count) && raw.count >= 0 ? raw.count : 0

    return { raw, lat, lng, count }
  })

  extracted.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }
    if (a.lat !== b.lat) {
      return a.lat - b.lat
    }
    return a.lng - b.lng
  })

  const items = extracted.map(({ raw }, index) =>
    normalizeHotspotItem(raw, index, fallbackCategory)
  )

  return { items }
}



