import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { workerAdminRoutes } from '../workerAdminHandlers'
import { authRoutes } from '../authHandlers'
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

describe('workerAdminRoutes - POST /workers validation and duplicate check', () => {
  let client
  const adminHeaders = { Authorization: 'Bearer mock-token-admin-1' }

  beforeEach(() => {
    resetMockWorkers()
    client = axios.create({
      adapter: createMockAdapter(workerAdminRoutes, { delayMs: 0 }),
    })
  })

  afterEach(() => {
    resetMockWorkers()
  })

  it('rejects POST /workers with 401 when no token is provided', async () => {
    await expect(
      client.post('/workers', {
        name: 'Kavita Deshmukh',
        phone: '9822211111',
        pin: '8888',
        department_id: 'd1',
        zone_id: 'z1',
      }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('rejects POST /workers with 403 when authenticated as a worker', async () => {
    await expect(
      client.post(
        '/workers',
        {
          name: 'Kavita Deshmukh',
          phone: '9822211111',
          pin: '8888',
          department_id: 'd1',
          zone_id: 'z1',
        },
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      ),
    ).rejects.toMatchObject({
      response: { status: 403 },
    })
  })

  it('rejects with 422 and a detailed list when all fields are invalid', async () => {
    try {
      await client.post(
        '/workers',
        {
          name: ' ',
          phone: '123',
          pin: '12',
          department_id: 'd99',
          zone_id: 'z99',
        },
        { headers: adminHeaders },
      )
      expect.fail('Expected 422 error')
    } catch (err) {
      expect(err.response.status).toBe(422)
      const detail = err.response.data.detail
      expect(Array.isArray(detail)).toBe(true)
      expect(detail).toEqual([
        { loc: ['body', 'name'], msg: 'Name must be at least 2 characters' },
        { loc: ['body', 'phone'], msg: 'Enter a valid phone number' },
        { loc: ['body', 'pin'], msg: 'PIN must be exactly 4 digits' },
        { loc: ['body', 'department_id'], msg: 'Choose a department' },
        { loc: ['body', 'zone_id'], msg: 'Choose a zone' },
      ])
    }
  })

  it('rejects with 409 when the phone number already exists, even with spaces or no prefix', async () => {
    // Existing worker 101 phone: +919876543210
    await expect(
      client.post(
        '/workers',
        {
          name: 'Duplicate Worker',
          phone: '9876543210',
          pin: '1234',
          department_id: 'd1',
          zone_id: 'z1',
        },
        { headers: adminHeaders },
      ),
    ).rejects.toMatchObject({
      response: {
        status: 409,
        data: { detail: 'A worker with this phone number already exists' },
      },
    })

    await expect(
      client.post(
        '/workers',
        {
          name: 'Duplicate Worker With Spaces',
          phone: '+91 98765 43210',
          pin: '1234',
          department_id: 'd1',
          zone_id: 'z1',
        },
        { headers: adminHeaders },
      ),
    ).rejects.toMatchObject({
      response: {
        status: 409,
      },
    })
  })
})

describe('workerAdminRoutes - POST /workers creation, login, and reset', () => {
  let client
  const adminHeaders = { Authorization: 'Bearer mock-token-admin-1' }

  beforeEach(() => {
    resetMockWorkers()
    client = axios.create({
      adapter: createMockAdapter([...authRoutes, ...workerAdminRoutes], { delayMs: 0 }),
      headers: adminHeaders,
    })
  })

  afterEach(() => {
    resetMockWorkers()
  })

  it('creates worker in-place, returns 201 with exactly 6 fields, and increments GET /workers count to 9', async () => {
    const createRes = await client.post('/workers', {
      name: '  Kavita Deshmukh  ',
      phone: '9822211111',
      pin: '8888',
      department_id: 'd1',
      zone_id: 'z1',
    })

    expect(createRes.status).toBe(201)
    expect(createRes.data).toEqual({
      id: '109',
      name: 'Kavita Deshmukh',
      phone: '+919822211111',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    })

    const jsonString = JSON.stringify(createRes.data)
    expect(jsonString).not.toContain('pin')
    expect(jsonString).not.toContain('department_id')
    expect(jsonString).not.toContain('zone_id')

    const getRes = await client.get('/workers')
    expect(getRes.data.items).toHaveLength(9)
    expect(getRes.data.total).toBe(9)
  })

  it('allows the newly created worker to log in immediately via authRoutes, rejecting wrong PIN with 401', async () => {
    await client.post('/workers', {
      name: 'Kavita Deshmukh',
      phone: '9822211111',
      pin: '8888',
      department_id: 'd1',
      zone_id: 'z1',
    })

    const loginRes = await client.post('/auth/worker/login', {
      phone: '9822211111',
      pin: '8888',
    })
    expect(loginRes.status).toBe(200)
    expect(loginRes.data.user.name).toBe('Kavita Deshmukh')
    expect(loginRes.data.user.id).toBe('109')

    await expect(
      client.post('/auth/worker/login', {
        phone: '9822211111',
        pin: '0000',
      }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('removes the created worker when resetMockWorkers is called', async () => {
    await client.post('/workers', {
      name: 'Kavita Deshmukh',
      phone: '9822211111',
      pin: '8888',
      department_id: 'd1',
      zone_id: 'z1',
    })

    resetMockWorkers()

    const getRes = await client.get('/workers')
    expect(getRes.data.items).toHaveLength(8)
    expect(getRes.data.total).toBe(8)
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
