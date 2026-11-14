import { afterEach, describe, expect, it, vi } from 'vitest'
import http from '../http'
import {
  exportAdminComplaintsCsv,
  fetchAdminComplaints,
  fetchAdminComplaint,
  fetchStats,
  fetchTrends,
  normalizeAdminComplaint,
  normalizeStats,
} from '../adminApi'

describe('normalizeStats', () => {
  it('normalizes a complete stats payload', () => {
    const raw = {
      department: { id: 1, name: 'Solid Waste Management' },
      totals: {
        total: 25,
        submitted: 5,
        in_progress: 10,
        completed: 10,
        overdue: 3,
        unassigned: 2,
      },
      by_category: [
        { category: 'Garbage Dump', count: 15 },
        { category: 'Dead Animal', count: 10 },
      ],
      by_zone: [
        { zone: 'Zone A', count: 20 },
        { zone: 'Zone B', count: 5 },
      ],
      pending_triage: 4,
    }

    expect(normalizeStats(raw)).toEqual({
      department: { id: '1', name: 'Solid Waste Management' },
      totals: {
        total: 25,
        submitted: 5,
        in_progress: 10,
        completed: 10,
        overdue: 3,
        unassigned: 2,
      },
      by_category: [
        { category: 'Garbage Dump', count: 15 },
        { category: 'Dead Animal', count: 10 },
      ],
      by_zone: [
        { zone: 'Zone A', count: 20 },
        { zone: 'Zone B', count: 5 },
      ],
      pending_triage: 4,
    })
  })

  it('safely defaults missing fields, nulls, and empty inputs', () => {
    expect(normalizeStats(null)).toEqual({
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
    })

    const partial = {
      department: null,
      totals: { total: 5 },
      by_category: null,
      by_zone: null,
    }

    expect(normalizeStats(partial)).toEqual({
      department: { id: '', name: '' },
      totals: {
        total: 5,
        submitted: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        unassigned: 0,
      },
      by_category: [],
      by_zone: [],
      pending_triage: 0,
    })
  })
})

describe('fetchStats', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /admin/stats and returns normalized data', async () => {
    const mockData = {
      department: { id: 'd1', name: 'Sanitation' },
      totals: {
        total: 12,
        submitted: 4,
        in_progress: 5,
        completed: 3,
        overdue: 1,
        unassigned: 2,
      },
      by_category: [{ category: 'Solid Waste', count: 12 }],
      by_zone: [{ zone: 'Zone A', count: 12 }],
      pending_triage: 0,
    }

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockData })

    const result = await fetchStats()
    expect(spy).toHaveBeenCalledWith('/admin/stats')
    expect(result.department.name).toBe('Sanitation')
    expect(result.totals.total).toBe(12)
    expect(result.by_category).toHaveLength(1)
  })

  it('defaults missing arrays to [] and missing numbers to 0', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({
      data: {
        department: { name: 'Health' },
        totals: {},
      },
    })

    const result = await fetchStats()
    expect(result.by_category).toEqual([])
    expect(result.by_zone).toEqual([])
    expect(result.totals.total).toBe(0)
    expect(result.totals.overdue).toBe(0)
    expect(result.pending_triage).toBe(0)
  })

  it('propagates server errors', async () => {
    vi.spyOn(http, 'get').mockRejectedValueOnce(new Error('Network error'))
    await expect(fetchStats()).rejects.toThrow('Network error')
  })
})

describe('fetchTrends', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /admin/trends with default days = 14 and returns array', async () => {
    const mockTrends = [
      { date: '2026-11-01', created: 3, completed: 2 },
      { date: '2026-11-02', created: 5, completed: 4 },
    ]

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockTrends })

    const result = await fetchTrends()
    expect(spy).toHaveBeenCalledWith('/admin/trends', { params: { days: 14 } })
    expect(result).toEqual(mockTrends)
  })

  it('sends custom days parameter', async () => {
    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: [] })

    const result = await fetchTrends({ days: 30 })
    expect(spy).toHaveBeenCalledWith('/admin/trends', { params: { days: 30 } })
    expect(result).toEqual([])
  })

  it('throws unexpected response error when data is not an array', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: { message: 'invalid' } })

    await expect(fetchTrends()).rejects.toThrow('Unexpected response from the server')
  })

  it('propagates server errors', async () => {
    vi.spyOn(http, 'get').mockRejectedValueOnce(new Error('500 Server Error'))
    await expect(fetchTrends()).rejects.toThrow('500 Server Error')
  })
})

describe('fetchAdminComplaints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends only the set filters, maps zoneId and pageSize, and omits false booleans', async () => {
    const mockResponse = {
      items: [{ id: '1', tracking_code: 'SAN-001', category: 'Garbage' }],
      total: 1,
      page: 2,
      page_size: 20,
    }

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockResponse })

    const result = await fetchAdminComplaints({
      status: 'Submitted',
      category: 'Garbage',
      zoneId: 3,
      overdue: true,
      unassigned: false,
      q: 'SAN',
      page: 2,
      pageSize: 20,
    })

    expect(spy).toHaveBeenCalledWith('/admin/complaints', {
      params: {
        status: 'Submitted',
        category: 'Garbage',
        zone_id: 3,
        overdue: true,
        q: 'SAN',
        page: 2,
        page_size: 20,
      },
    })

    expect(result).toEqual({
      items: mockResponse.items,
      total: 1,
      page: 2,
      pageSize: 20,
    })
  })

  it('omits empty strings and falsy filters when called with defaults or empty options', async () => {
    const mockResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    }

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockResponse })

    const result = await fetchAdminComplaints({
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
      q: '   ',
    })

    expect(spy).toHaveBeenCalledWith('/admin/complaints', { params: {} })
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
  })

  it('returns default page and pageSize if backend response omits them', async () => {
    const mockResponse = {
      items: [{ id: '10' }],
    }

    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockResponse })

    const result = await fetchAdminComplaints({ page: 3, pageSize: 50 })

    expect(result).toEqual({
      items: mockResponse.items,
      total: 1,
      page: 3,
      pageSize: 50,
    })
  })

  it('throws unexpected response error when items is not an array', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: { items: 'not-an-array' } })
    await expect(fetchAdminComplaints()).rejects.toThrow('Unexpected response from the server')

    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: null })
    await expect(fetchAdminComplaints()).rejects.toThrow('Unexpected response from the server')
  })

  it('propagates server errors', async () => {
    vi.spyOn(http, 'get').mockRejectedValueOnce(new Error('Network disconnected'))
    await expect(fetchAdminComplaints()).rejects.toThrow('Network disconnected')
  })
})

describe('normalizeAdminComplaint', () => {
  it('normalizes a full complaint detail payload with zone, worker, logs, and resolution', () => {
    const raw = {
      id: 'c-101',
      tracking_code: 'SAN-20261114-1029',
      category: 'Garbage Dump',
      status: 'Completed',
      priority: 'high',
      zone: { id: 1, name: 'Zone A' },
      assigned_worker: { id: 2, name: 'Ramesh Patil' },
      description: 'Piles of uncollected waste near market',
      sla_deadline: '2026-11-14T18:00:00Z',
      is_overdue: true,
      created_at: '2026-11-14T10:00:00Z',
      resolved_at: '2026-11-14T17:30:00Z',
      image_url: 'https://storage.local/complaint.jpg',
      latitude: 17.68,
      longitude: 75.88,
      carry_forward_count: 2,
      logs: [
        {
          event_type: 'created',
          actor_type: 'citizen',
          created_at: '2026-11-14T10:00:00Z',
          details: null,
        },
        {
          event_type: 'resolved',
          actor_type: 'worker',
          created_at: '2026-11-14T17:30:00Z',
          details: { worker_id: 2 },
        },
      ],
      resolution: {
        note: 'Waste cleared completely.',
        photo_url: 'https://storage.local/resolution.jpg',
        completed_at: '2026-11-14T17:30:00Z',
        worker: { id: 2, name: 'Ramesh Patil' },
      },
    }

    const result = normalizeAdminComplaint(raw)

    expect(result).toEqual({
      id: 'c-101',
      tracking_code: 'SAN-20261114-1029',
      category: 'Garbage Dump',
      status: 'Completed',
      priority: 'high',
      zone: { id: '1', name: 'Zone A' },
      assigned_worker: { id: '2', name: 'Ramesh Patil' },
      description: 'Piles of uncollected waste near market',
      sla_deadline: '2026-11-14T18:00:00Z',
      is_overdue: true,
      created_at: '2026-11-14T10:00:00Z',
      resolved_at: '2026-11-14T17:30:00Z',
      image_url: 'https://storage.local/complaint.jpg',
      latitude: 17.68,
      longitude: 75.88,
      carry_forward_count: 2,
      logs: [
        {
          event_type: 'created',
          actor_type: 'citizen',
          created_at: '2026-11-14T10:00:00Z',
          details: null,
        },
        {
          event_type: 'resolved',
          actor_type: 'worker',
          created_at: '2026-11-14T17:30:00Z',
          details: { worker_id: 2 },
        },
      ],
      resolution: {
        note: 'Waste cleared completely.',
        photo_url: 'https://storage.local/resolution.jpg',
        completed_at: '2026-11-14T17:30:00Z',
        worker: { id: '2', name: 'Ramesh Patil' },
      },
    })
  })

  it('safely defaults missing fields, nulls, and empty structures', () => {
    expect(normalizeAdminComplaint(null)).toEqual({
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
    })

    const partial = {
      id: 'c-202',
      tracking_code: 'SAN-202',
      carry_forward_count: 'not-a-number',
      logs: null,
      resolution: null,
    }

    const result = normalizeAdminComplaint(partial)
    expect(result.id).toBe('c-202')
    expect(result.carry_forward_count).toBe(0)
    expect(result.logs).toEqual([])
    expect(result.resolution).toBeNull()
    expect(result.zone).toBeNull()
    expect(result.assigned_worker).toBeNull()
  })
})

describe('fetchAdminComplaint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /admin/complaints/:id with encoded id and returns normalized data', async () => {
    const mockRaw = {
      id: 'uuid-1234',
      tracking_code: 'SAN-20261114-1234',
      category: 'Garbage Dump',
      status: 'In-Progress',
      priority: 'medium',
      sla_deadline: '2026-11-15T10:00:00Z',
      is_overdue: false,
      created_at: '2026-11-14T09:00:00Z',
    }

    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockRaw })

    const result = await fetchAdminComplaint('uuid-1234')

    expect(spy).toHaveBeenCalledWith('/admin/complaints/uuid-1234')
    expect(result.id).toBe('uuid-1234')
    expect(result.tracking_code).toBe('SAN-20261114-1234')
    expect(result.logs).toEqual([])
    expect(result.resolution).toBeNull()
  })

  it('throws an error when no complaint id is supplied', async () => {
    await expect(fetchAdminComplaint('')).rejects.toThrow('A complaint ID must be provided')
    await expect(fetchAdminComplaint(null)).rejects.toThrow('A complaint ID must be provided')
  })

  it('throws unexpected response error when server returns non-object or null', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: null })
    await expect(fetchAdminComplaint('id-1')).rejects.toThrow('Unexpected response from the server')

    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: 'invalid' })
    await expect(fetchAdminComplaint('id-1')).rejects.toThrow('Unexpected response from the server')
  })

  it('propagates server errors such as 404', async () => {
    const error404 = new Error('Request failed with status code 404')
    error404.response = { status: 404, data: { detail: 'Complaint not found' } }

    vi.spyOn(http, 'get').mockRejectedValueOnce(error404)

    await expect(fetchAdminComplaint('missing-uuid')).rejects.toMatchObject({
      response: { status: 404 },
    })
  })
})

describe('exportAdminComplaintsCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends set filters, maps zoneId to zone_id, requests a blob, and returns a Blob', async () => {
    const mockBlob = new Blob(['tracking_code,category\nSAN-1,Garbage'], { type: 'text/csv' })
    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockBlob })

    const result = await exportAdminComplaintsCsv({
      status: 'In-Progress',
      category: 'Garbage Dump',
      zoneId: '2',
      overdue: true,
      unassigned: true,
      q: '  market  ',
    })

    expect(spy).toHaveBeenCalledWith('/admin/complaints/export', {
      params: {
        status: 'In-Progress',
        category: 'Garbage Dump',
        zone_id: '2',
        overdue: true,
        unassigned: true,
        q: 'market',
      },
      responseType: 'blob',
    })
    expect(result).toBeInstanceOf(Blob)
    expect(result).toBe(mockBlob)
  })

  it('omits unset, empty, and falsy filters', async () => {
    const mockBlob = new Blob([''], { type: 'text/csv' })
    const spy = vi.spyOn(http, 'get').mockResolvedValueOnce({ data: mockBlob })

    await exportAdminComplaintsCsv({
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
      q: '   ',
    })

    expect(spy).toHaveBeenCalledWith('/admin/complaints/export', {
      params: {},
      responseType: 'blob',
    })
  })

  it('wraps non-blob responses into a Blob instance', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce({ data: 'raw,csv,string' })

    const result = await exportAdminComplaintsCsv()
    expect(result).toBeInstanceOf(Blob)
  })

  it('propagates server errors', async () => {
    vi.spyOn(http, 'get').mockRejectedValueOnce(new Error('Export failed'))
    await expect(exportAdminComplaintsCsv()).rejects.toThrow('Export failed')
  })
})



