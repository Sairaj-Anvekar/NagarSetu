import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { workerAdminRoutes } from '../workerAdminHandlers'
import { resetMockWorkers } from '../mockData'

describe('workerAdminRoutes - Auth & GET /workers', () => {
  let client

  beforeEach(() => {
    resetMockWorkers()
    client = axios.create({
      adapter: createMockAdapter(workerAdminRoutes, { delayMs: 0 }),
    })
  })

  afterEach(() => {
    resetMockWorkers()
  })

  it('rejects GET /workers with 401 when no Authorization header is sent', async () => {
    await expect(client.get('/workers')).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('rejects GET /workers with 403 when authenticated as a worker', async () => {
    await expect(
      client.get('/workers', {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      }),
    ).rejects.toMatchObject({
      response: { status: 403 },
    })
  })

  it('resolves 8 workers with total 8, page 1, page_size 100 for an admin', async () => {
    const res = await client.get('/workers', {
      headers: { Authorization: 'Bearer mock-token-admin-1' },
    })

    expect(res.status).toBe(200)
    expect(res.data.total).toBe(8)
    expect(res.data.page).toBe(1)
    expect(res.data.page_size).toBe(100)
    expect(res.data.items).toHaveLength(8)

    const expectedKeys = ['department', 'id', 'is_active', 'name', 'phone', 'zone'].sort()
    for (const item of res.data.items) {
      expect(Object.keys(item).sort()).toEqual(expectedKeys)
    }

    const jsonString = JSON.stringify(res.data)
    expect(jsonString).not.toContain('pin')
    expect(jsonString).not.toContain('department_id')
    expect(jsonString).not.toContain('zone_id')
  })
})

describe('workerAdminRoutes - PATCH /workers/:id & Integration', () => {
  let adminClient
  let fullClient

  beforeEach(() => {
    resetMockWorkers()
    adminClient = axios.create({
      adapter: createMockAdapter(workerAdminRoutes, { delayMs: 0 }),
      headers: { Authorization: 'Bearer mock-token-admin-1' },
    })
  })

  afterEach(() => {
    resetMockWorkers()
  })

  it('deactivates worker 101, returns is_active false, and persists in GET', async () => {
    const patchRes = await adminClient.patch('/workers/101', { is_active: false })
    expect(patchRes.status).toBe(200)
    expect(patchRes.data.id).toBe('101')
    expect(patchRes.data.is_active).toBe(false)

    const getRes = await adminClient.get('/workers')
    const worker101 = getRes.data.items.find((w) => w.id === '101')
    expect(worker101.is_active).toBe(false)
  })

  it('rejects PATCH with 422 and an array detail when is_active is missing or not a boolean', async () => {
    try {
      await adminClient.patch('/workers/101', {})
      expect.fail('Expected 422 error')
    } catch (err) {
      expect(err.response.status).toBe(422)
      expect(Array.isArray(err.response.data.detail)).toBe(true)
    }

    try {
      await adminClient.patch('/workers/101', { is_active: 'yes' })
      expect.fail('Expected 422 error')
    } catch (err) {
      expect(err.response.status).toBe(422)
      expect(Array.isArray(err.response.data.detail)).toBe(true)
    }
  })

  it('rejects PATCH with 404 for an unknown worker id', async () => {
    await expect(adminClient.patch('/workers/999', { is_active: false })).rejects.toMatchObject({
      response: { status: 404 },
    })
  })

  it('rejects PATCH with 500 when targeting worker 105', async () => {
    await expect(adminClient.patch('/workers/105', { is_active: false })).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('locks out worker 101 from logging in after deactivation, and resetMockWorkers restores access', async () => {
    const { authRoutes } = await import('../authHandlers')
    fullClient = axios.create({
      adapter: createMockAdapter([...authRoutes, ...workerAdminRoutes], { delayMs: 0 }),
    })

    // Before deactivation: worker login succeeds
    const preLogin = await fullClient.post('/auth/worker/login', {
      phone: '9876543210',
      pin: '1234',
    })
    expect(preLogin.status).toBe(200)

    // Admin deactivates worker 101
    await fullClient.patch(
      '/workers/101',
      { is_active: false },
      { headers: { Authorization: 'Bearer mock-token-admin-1' } },
    )

    // Now worker login must be rejected with 403
    await expect(
      fullClient.post('/auth/worker/login', {
        phone: '9876543210',
        pin: '1234',
      }),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { detail: 'Account is deactivated' },
      },
    })

    // resetMockWorkers restores original data
    resetMockWorkers()

    const postResetLogin = await fullClient.post('/auth/worker/login', {
      phone: '9876543210',
      pin: '1234',
    })
    expect(postResetLogin.status).toBe(200)
    expect(postResetLogin.data.user.id).toBe('101')
  })
})
