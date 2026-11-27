import { afterEach, describe, expect, it, vi } from 'vitest'
import http from '../http'
import { confirmTriageCategory, fetchTriageItems, normalizeTriageItem } from '../triageApi'

describe('normalizeTriageItem', () => {
  it('normalizes a complete raw triage item safely', () => {
    const raw = {
      id: 'trg-101',
      complaint_id: 'c-202',
      tracking_code: 'GRV-2026-TR01',
      predicted_category: 'Solid Waste & Garbage',
      ai_confidence: 0.58,
      status: 'pending',
      final_category: null,
      description: 'Piles of garbage on sidewalk',
      image_url: 'https://images.local/triage.jpg',
      created_at: '2026-11-25T10:00:00Z',
      zone: 'Zone A',
      classifier_source: 'image',
      reviewed_at: null,
    }

    expect(normalizeTriageItem(raw)).toEqual({
      id: 'trg-101',
      complaint_id: 'c-202',
      tracking_code: 'GRV-2026-TR01',
      predicted_category: 'Solid Waste & Garbage',
      ai_confidence: 0.58,
      status: 'pending',
      final_category: null,
      description: 'Piles of garbage on sidewalk',
      image_url: 'https://images.local/triage.jpg',
      created_at: '2026-11-25T10:00:00Z',
      zone: 'Zone A',
      classifier_source: 'image',
      reviewed_at: null,
    })
  })

  it('clamps confidence between 0 and 1, extracts zone object name, and provides defaults', () => {
    expect(normalizeTriageItem(null)).toEqual({
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
    })

    const partial = {
      id: 55,
      complaint_id: 88,
      ai_confidence: 1.5,
      zone: { id: 'z1', name: 'Zone B' },
      status: 'reviewed',
      final_category: 'Potholes & Road Damage',
      image_url: '   ',
    }

    const normalized = normalizeTriageItem(partial)
    expect(normalized.id).toBe('55')
    expect(normalized.complaint_id).toBe('88')
    expect(normalized.ai_confidence).toBe(1)
    expect(normalized.zone).toBe('Zone B')
    expect(normalized.status).toBe('reviewed')
    expect(normalized.final_category).toBe('Potholes & Road Damage')
    expect(normalized.image_url).toBeNull()
  })
})

describe('fetchTriageItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /admin/triage with default parameters and normalizes results', async () => {
    const mockData = {
      items: [
        {
          id: 'trg-1',
          tracking_code: 'GRV-1',
          predicted_category: 'Solid Waste & Garbage',
          ai_confidence: 0.52,
          status: 'pending',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    }

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockData })

    const result = await fetchTriageItems()
    expect(spy).toHaveBeenCalledWith('/admin/triage', {
      params: { status: 'pending', page: 1, page_size: 20 },
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('trg-1')
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('sends reviewed status and custom page/pageSize params', async () => {
    const mockData = { items: [], total: 0, page: 2, page_size: 50 }
    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockData })

    await fetchTriageItems({ status: 'reviewed', page: 2, pageSize: 50 })
    expect(spy).toHaveBeenCalledWith('/admin/triage', {
      params: { status: 'reviewed', page: 2, page_size: 50 },
    })
  })

  it('throws unexpected response error when items is not an array', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: { items: 'not-an-array' } })
    await expect(fetchTriageItems()).rejects.toThrow('Unexpected response from the server')

    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: null })
    await expect(fetchTriageItems()).rejects.toThrow('Unexpected response from the server')
  })

  it('propagates HTTP network errors', async () => {
    vi.spyOn(http, 'get').mockRejectedValueOnce(new Error('Network error'))
    await expect(fetchTriageItems()).rejects.toThrow('Network error')
  })
})

describe('confirmTriageCategory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates id and category arguments before making request', async () => {
    await expect(confirmTriageCategory('', 'Solid Waste & Garbage')).rejects.toThrow(
      'A triage case ID must be provided',
    )
    await expect(confirmTriageCategory('trg-1', '')).rejects.toThrow(
      'A category must be provided',
    )
    await expect(confirmTriageCategory('trg-1', null)).rejects.toThrow(
      'A category must be provided',
    )
  })

  it('sends PATCH /admin/triage/:id and returns confirmed review response', async () => {
    const mockResponse = {
      id: 'trg-1',
      tracking_code: 'GRV-TR01',
      status: 'reviewed',
      final_category: 'Potholes & Road Damage',
      moved_to_department: 'Public Works Department',
    }

    const spy = vi.spyOn(http, 'patch').mockResolvedValueOnce({ data: mockResponse })

    const result = await confirmTriageCategory('trg-1', 'Potholes & Road Damage')
    expect(spy).toHaveBeenCalledWith('/admin/triage/trg-1', {
      category: 'Potholes & Road Damage',
    })
    expect(result).toEqual({
      id: 'trg-1',
      tracking_code: 'GRV-TR01',
      status: 'reviewed',
      final_category: 'Potholes & Road Damage',
      moved_to_department: 'Public Works Department',
    })
  })

  it('propagates API error responses such as 409 conflict and 422', async () => {
    const error409 = new Error('Request failed with status code 409')
    error409.response = { status: 409, data: { detail: 'This case has already been reviewed' } }

    vi.spyOn(http, 'patch').mockRejectedValueOnce(error409)

    await expect(confirmTriageCategory('trg-1', 'Solid Waste & Garbage')).rejects.toMatchObject({
      response: { status: 409 },
    })
  })
})
