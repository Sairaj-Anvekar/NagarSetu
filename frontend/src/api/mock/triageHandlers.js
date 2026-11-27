import { MockHttpError } from './mockAdapter'
import { readMockSession } from './mockAuth'
import {
  CATEGORY_NAMES,
  getMovedDepartment,
} from '../../constants/triageCategories'

export const INITIAL_MOCK_TRIAGE_ITEMS = [
  {
    id: 'trg-1',
    complaint_id: 'c-101',
    tracking_code: 'GRV-2026-TR01',
    predicted_category: 'Solid Waste & Garbage',
    ai_confidence: 0.58,
    status: 'pending',
    final_category: null,
    description:
      'Overflowing dustbin near the commercial complex with debris spilling onto the pathway.',
    image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
    created_at: '2026-11-25T08:15:00.000Z',
    zone: 'Zone A',
    classifier_source: 'image',
    reviewed_at: null,
  },
  {
    id: 'trg-2',
    complaint_id: 'c-102',
    tracking_code: 'GRV-2026-TR02',
    predicted_category: 'Potholes & Road Damage',
    ai_confidence: 0.46,
    status: 'pending',
    final_category: null,
    description:
      'Deep road depression near junction causing water accumulation and vehicle damage.',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
    created_at: '2026-11-25T14:30:00.000Z',
    zone: 'Zone B',
    classifier_source: 'text',
    reviewed_at: null,
  },
  {
    id: 'trg-3',
    complaint_id: 'c-103',
    tracking_code: 'GRV-2026-TR03',
    predicted_category: 'Waterlogging & Drainage',
    ai_confidence: 0.64,
    status: 'pending',
    final_category: null,
    description:
      'Blocked stormwater drain causing foul-smelling street pooling after morning rains.',
    image_url: null,
    created_at: '2026-11-26T09:00:00.000Z',
    zone: 'Zone A',
    classifier_source: 'text',
    reviewed_at: null,
  },
  {
    id: 'trg-4',
    complaint_id: 'c-104',
    tracking_code: 'GRV-2026-TR04',
    predicted_category: 'Streetlight',
    ai_confidence: 0.52,
    status: 'pending',
    final_category: null,
    description:
      'Flickering street lamp pole with loose overhead wiring hanging close to trees.',
    image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
    created_at: '2026-11-26T18:45:00.000Z',
    zone: 'Zone C',
    classifier_source: 'image',
    reviewed_at: null,
  },
  {
    id: 'trg-5',
    complaint_id: 'c-105',
    tracking_code: 'GRV-2026-TR05',
    predicted_category: 'Illegal Encroachment',
    ai_confidence: 0.49,
    status: 'reviewed',
    final_category: 'Illegal Encroachment',
    description: 'Temporary fruit stalls blocking pedestrian passage.',
    image_url: null,
    created_at: '2026-11-24T10:00:00.000Z',
    reviewed_at: '2026-11-25T11:00:00.000Z',
    zone: 'Zone A',
    classifier_source: 'image',
  },
  {
    id: 'trg-6',
    complaint_id: 'c-106',
    tracking_code: 'GRV-2026-TR06',
    predicted_category: 'Solid Waste & Garbage',
    ai_confidence: 0.61,
    status: 'reviewed',
    final_category: 'Solid Waste & Garbage',
    description: 'Scattered plastic bags and dry leaves in municipal park.',
    image_url: null,
    created_at: '2026-11-24T12:00:00.000Z',
    reviewed_at: '2026-11-25T16:20:00.000Z',
    zone: 'Zone D',
    classifier_source: 'text',
  },
]

export const MOCK_TRIAGE_ITEMS = JSON.parse(JSON.stringify(INITIAL_MOCK_TRIAGE_ITEMS))

export function resetMockTriage() {
  MOCK_TRIAGE_ITEMS.length = 0
  for (const item of JSON.parse(JSON.stringify(INITIAL_MOCK_TRIAGE_ITEMS))) {
    MOCK_TRIAGE_ITEMS.push(item)
  }
}

function requireAdmin(headers) {
  const session = readMockSession(headers)
  if (!session) {
    throw new MockHttpError(401, 'Not authenticated')
  }
  if (session.role !== 'admin') {
    throw new MockHttpError(403, 'Not enough permissions')
  }
  return session
}

function handleGetTriage({ headers, query }) {
  requireAdmin(headers)

  const status = query?.status === 'reviewed' ? 'reviewed' : 'pending'
  const page = Math.max(1, parseInt(query?.page, 10) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(query?.page_size, 10) || 20))

  const filtered = MOCK_TRIAGE_ITEMS.filter((item) => item.status === status)

  filtered.sort((a, b) => {
    if (status === 'pending') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    const timeA = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0
    const timeB = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0
    return timeB - timeA
  })

  const total = filtered.length
  const startIndex = (page - 1) * pageSize
  const items = filtered.slice(startIndex, startIndex + pageSize)

  return {
    status: 200,
    data: {
      items,
      total,
      page,
      page_size: pageSize,
    },
  }
}

function handlePatchTriage({ headers, params, body }) {
  requireAdmin(headers)

  const id = decodeURIComponent(params.id)
  const category = typeof body?.category === 'string' ? body.category.trim() : ''

  if (!category || !CATEGORY_NAMES.includes(category)) {
    throw new MockHttpError(422, [
      { loc: ['body', 'category'], msg: 'Unknown category' },
    ])
  }

  if (id === 'trg-handling-conflict') {
    throw new MockHttpError(
      409,
      'Complaint is already being handled; its category can no longer be changed',
    )
  }

  const item = MOCK_TRIAGE_ITEMS.find((t) => t.id === id)
  if (!item) {
    throw new MockHttpError(404, 'Triage case not found')
  }

  if (item.status === 'reviewed') {
    throw new MockHttpError(409, 'This case has already been reviewed')
  }

  const movedToDept = getMovedDepartment(category, 'Sanitation')

  item.status = 'reviewed'
  item.final_category = category
  item.reviewed_at = new Date().toISOString()

  return {
    status: 200,
    data: {
      id: item.id,
      tracking_code: item.tracking_code,
      status: 'reviewed',
      final_category: item.final_category,
      moved_to_department: movedToDept,
    },
  }
}

export const triageRoutes = [
  {
    method: 'GET',
    path: '/admin/triage',
    handler: handleGetTriage,
  },
  {
    method: 'PATCH',
    path: '/admin/triage/:id',
    handler: handlePatchTriage,
  },
]
