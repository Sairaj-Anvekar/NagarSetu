import { beforeEach, describe, expect, it } from 'vitest'
import { makeMockToken } from '../mockAuth'
import {
  MOCK_TRIAGE_ITEMS,
  resetMockTriage,
  triageRoutes,
} from '../triageHandlers'

describe('triage mock handlers', () => {
  let adminHeaders
  let workerHeaders
  const getRoute = triageRoutes.find((r) => r.method === 'GET' && r.path === '/admin/triage')
  const patchRoute = triageRoutes.find((r) => r.method === 'PATCH' && r.path === '/admin/triage/:id')

  beforeEach(() => {
    resetMockTriage()
    adminHeaders = { authorization: `Bearer ${makeMockToken('admin', '1')}` }
    workerHeaders = { authorization: `Bearer ${makeMockToken('worker', '101')}` }
  })

  it('rejects unauthorized or worker requests with 401 and 403', () => {
    expect(() => getRoute.handler({ headers: {}, query: {} })).toThrowError('Not authenticated')
    expect(() => getRoute.handler({ headers: workerHeaders, query: {} })).toThrowError(
      'Not enough permissions',
    )
    expect(() =>
      patchRoute.handler({ headers: {}, params: { id: 'trg-1' }, body: { category: 'Streetlight' } }),
    ).toThrowError('Not authenticated')
    expect(() =>
      patchRoute.handler({
        headers: workerHeaders,
        params: { id: 'trg-1' },
        body: { category: 'Streetlight' },
      }),
    ).toThrowError('Not enough permissions')
  })

  it('returns pending items sorted oldest first by default', () => {
    const res = getRoute.handler({ headers: adminHeaders, query: { status: 'pending' } })
    expect(res.status).toBe(200)
    expect(res.data.total).toBe(4)
    expect(res.data.items).toHaveLength(4)
    expect(res.data.items[0].id).toBe('trg-1')
    expect(res.data.items[0].ai_confidence).toBe(0.58)
    expect(res.data.items[1].id).toBe('trg-2')
    expect(res.data.items[1].ai_confidence).toBe(0.46)
    expect(res.data.items[2].id).toBe('trg-3')
    expect(res.data.items[2].image_url).toBeNull()
  })

  it('returns reviewed items sorted most recently reviewed first', () => {
    const res = getRoute.handler({ headers: adminHeaders, query: { status: 'reviewed' } })
    expect(res.status).toBe(200)
    expect(res.data.total).toBe(2)
    expect(res.data.items).toHaveLength(2)
    expect(res.data.items[0].id).toBe('trg-6')
    expect(res.data.items[1].id).toBe('trg-5')
  })

  it('supports pagination parameters', () => {
    const res = getRoute.handler({
      headers: adminHeaders,
      query: { status: 'pending', page: '2', page_size: '2' },
    })
    expect(res.data.page).toBe(2)
    expect(res.data.page_size).toBe(2)
    expect(res.data.items).toHaveLength(2)
    expect(res.data.items[0].id).toBe('trg-3')
    expect(res.data.items[1].id).toBe('trg-4')
  })

  it('confirms a pending case for Sanitation and leaves moved_to_department as null', () => {
    const res = patchRoute.handler({
      headers: adminHeaders,
      params: { id: 'trg-1' },
      body: { category: 'Waterlogging & Drainage' },
    })
    expect(res.status).toBe(200)
    expect(res.data).toEqual({
      id: 'trg-1',
      tracking_code: 'GRV-2026-TR01',
      status: 'reviewed',
      final_category: 'Waterlogging & Drainage',
      moved_to_department: null,
    })

    const updated = MOCK_TRIAGE_ITEMS.find((t) => t.id === 'trg-1')
    expect(updated.status).toBe('reviewed')
    expect(updated.final_category).toBe('Waterlogging & Drainage')
    expect(updated.reviewed_at).toBeDefined()
  })

  it('confirms a case with a cross-department category and sets moved_to_department', () => {
    const res = patchRoute.handler({
      headers: adminHeaders,
      params: { id: 'trg-2' },
      body: { category: 'Potholes & Road Damage' },
    })
    expect(res.status).toBe(200)
    expect(res.data.moved_to_department).toBe('Public Works Department')
    expect(res.data.final_category).toBe('Potholes & Road Damage')
  })

  it('throws 422 for unknown category', () => {
    expect(() =>
      patchRoute.handler({
        headers: adminHeaders,
        params: { id: 'trg-1' },
        body: { category: 'Invalid Category' },
      }),
    ).toThrowError('Mock HTTP error')
  })

  it('throws 404 for non-existent triage item', () => {
    expect(() =>
      patchRoute.handler({
        headers: adminHeaders,
        params: { id: 'trg-nonexistent' },
        body: { category: 'Solid Waste & Garbage' },
      }),
    ).toThrowError('Triage case not found')
  })

  it('throws 409 for already-reviewed item', () => {
    expect(() =>
      patchRoute.handler({
        headers: adminHeaders,
        params: { id: 'trg-5' },
        body: { category: 'Solid Waste & Garbage' },
      }),
    ).toThrowError('This case has already been reviewed')
  })

  it('throws 409 for complaint already being handled', () => {
    expect(() =>
      patchRoute.handler({
        headers: adminHeaders,
        params: { id: 'trg-handling-conflict' },
        body: { category: 'Solid Waste & Garbage' },
      }),
    ).toThrowError('Complaint is already being handled; its category can no longer be changed')
  })
})
