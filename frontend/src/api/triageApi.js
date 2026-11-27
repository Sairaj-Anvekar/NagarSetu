import http from './http'

/**
 * Normalizes raw triage item received from the API into a predictable shape.
 *
 * @param {unknown} raw
 * @returns {{
 *   id: string,
 *   complaint_id: string,
 *   tracking_code: string,
 *   predicted_category: string,
 *   ai_confidence: number,
 *   status: 'pending' | 'reviewed',
 *   final_category: string | null,
 *   description: string | null,
 *   image_url: string | null,
 *   created_at: string,
 *   zone: string | null,
 *   classifier_source: string | null,
 *   reviewed_at: string | null
 * }}
 */
export function normalizeTriageItem(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      complaint_id: '',
      tracking_code: '',
      predicted_category: '',
      ai_confidence: 0,
      status: 'pending',
      final_category: null,
      description: null,
      image_url: null,
      created_at: '',
      zone: null,
      classifier_source: null,
      reviewed_at: null,
    }
  }

  const confidence =
    typeof raw.ai_confidence === 'number' && !Number.isNaN(raw.ai_confidence)
      ? Math.max(0, Math.min(1, raw.ai_confidence))
      : 0

  let zoneName = null
  if (typeof raw.zone === 'string' && raw.zone.trim() !== '') {
    zoneName = raw.zone.trim()
  } else if (raw.zone && typeof raw.zone === 'object' && typeof raw.zone.name === 'string') {
    zoneName = raw.zone.name.trim() || null
  }

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : '',
    complaint_id:
      raw.complaint_id !== undefined && raw.complaint_id !== null ? String(raw.complaint_id) : '',
    tracking_code: typeof raw.tracking_code === 'string' ? raw.tracking_code : '',
    predicted_category: typeof raw.predicted_category === 'string' ? raw.predicted_category : '',
    ai_confidence: confidence,
    status: raw.status === 'reviewed' ? 'reviewed' : 'pending',
    final_category: typeof raw.final_category === 'string' ? raw.final_category : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    image_url: typeof raw.image_url === 'string' && raw.image_url.trim() ? raw.image_url : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
    zone: zoneName,
    classifier_source:
      typeof raw.classifier_source === 'string' ? raw.classifier_source : null,
    reviewed_at: typeof raw.reviewed_at === 'string' ? raw.reviewed_at : null,
  }
}

/**
 * Fetches paginated triage items by review status ('pending' or 'reviewed').
 *
 * @param {{ status?: 'pending' | 'reviewed', page?: number, pageSize?: number }} [options]
 * @returns {Promise<{ items: Array<ReturnType<typeof normalizeTriageItem>>, total: number, page: number, pageSize: number }>}
 */
export async function fetchTriageItems({ status = 'pending', page = 1, pageSize = 20 } = {}) {
  const params = {
    status: status === 'reviewed' ? 'reviewed' : 'pending',
    page: Math.max(1, parseInt(page, 10) || 1),
    page_size: Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20)),
  }

  const { data } = await http.get('/admin/triage', { params })

  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Unexpected response from the server')
  }

  return {
    items: data.items.map(normalizeTriageItem),
    total: typeof data.total === 'number' ? data.total : data.items.length,
    page: typeof data.page === 'number' ? data.page : params.page,
    pageSize: typeof data.page_size === 'number' ? data.page_size : params.page_size,
  }
}

/**
 * Confirms or corrects the category of a low-confidence AI classification case.
 *
 * @param {string} id - The triage case ID
 * @param {string} category - One of the approved six categories
 * @returns {Promise<{
 *   id: string,
 *   tracking_code: string,
 *   status: 'reviewed',
 *   final_category: string,
 *   moved_to_department: string | null
 * }>}
 */
export async function confirmTriageCategory(id, category) {
  if (!id) {
    throw new Error('A triage case ID must be provided')
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error('A category must be provided')
  }

  const { data } = await http.patch(`/admin/triage/${encodeURIComponent(id)}`, {
    category: category.trim(),
  })

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response from the server')
  }

  return {
    id: data.id !== undefined && data.id !== null ? String(data.id) : String(id),
    tracking_code: typeof data.tracking_code === 'string' ? data.tracking_code : '',
    status: 'reviewed',
    final_category: typeof data.final_category === 'string' ? data.final_category : category.trim(),
    moved_to_department:
      typeof data.moved_to_department === 'string' ? data.moved_to_department : null,
  }
}
