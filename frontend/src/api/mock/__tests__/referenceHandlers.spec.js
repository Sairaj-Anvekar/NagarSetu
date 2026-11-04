import { describe, expect, it } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { referenceRoutes } from '../referenceHandlers'
import { MOCK_DEPARTMENTS, MOCK_WORKERS, MOCK_ZONES } from '../mockData'

describe('referenceRoutes', () => {
  const client = axios.create({
    adapter: createMockAdapter(referenceRoutes, { delayMs: 0 }),
  })

  it('rejects GET /departments and GET /zones with 401 when no token is provided', async () => {
    await expect(client.get('/departments')).rejects.toMatchObject({
      response: { status: 401 },
    })

    await expect(client.get('/zones')).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('rejects GET /departments and GET /zones with 403 for a worker token', async () => {
    const workerHeaders = { headers: { Authorization: 'Bearer mock-token-worker-101' } }

    await expect(client.get('/departments', workerHeaders)).rejects.toMatchObject({
      response: { status: 403 },
    })

    await expect(client.get('/zones', workerHeaders)).rejects.toMatchObject({
      response: { status: 403 },
    })
  })

  it('returns 8 departments and 4 zones with paging fields for an admin token', async () => {
    const adminHeaders = { headers: { Authorization: 'Bearer mock-token-admin-1' } }

    const deptRes = await client.get('/departments', adminHeaders)
    expect(deptRes.status).toBe(200)
    expect(deptRes.data.total).toBe(8)
    expect(deptRes.data.page).toBe(1)
    expect(deptRes.data.page_size).toBe(100)
    expect(deptRes.data.items).toHaveLength(8)
    expect(deptRes.data.items[0]).toHaveProperty('id')
    expect(deptRes.data.items[0]).toHaveProperty('name')

    const zoneRes = await client.get('/zones', adminHeaders)
    expect(zoneRes.status).toBe(200)
    expect(zoneRes.data.total).toBe(4)
    expect(zoneRes.data.page).toBe(1)
    expect(zoneRes.data.page_size).toBe(100)
    expect(zoneRes.data.items).toHaveLength(4)
    expect(zoneRes.data.items[0]).toHaveProperty('id')
    expect(zoneRes.data.items[0]).toHaveProperty('name')
  })

  it('ensures every department_id and zone_id in MOCK_WORKERS exists in MOCK_DEPARTMENTS and MOCK_ZONES', () => {
    const deptIds = new Set(MOCK_DEPARTMENTS.map((d) => d.id))
    const zoneIds = new Set(MOCK_ZONES.map((z) => z.id))

    for (const worker of MOCK_WORKERS) {
      expect(deptIds.has(worker.department_id)).toBe(true)
      expect(zoneIds.has(worker.zone_id)).toBe(true)
    }
  })
})

