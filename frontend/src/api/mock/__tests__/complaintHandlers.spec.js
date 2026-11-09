import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { workerRoutes } from '../workerHandlers'
import { complaintRoutes } from '../complaintHandlers'
import { resetMockTasks, resetMockWorkers, MOCK_TASKS, MOCK_RESOLUTIONS } from '../mockData'
import { uninstallMockApi } from '../index'

const CONTRACT_KEYS = [
  'id',
  'tracking_code',
  'category',
  'description',
  'image_url',
  'latitude',
  'longitude',
  'priority',
  'status',
  'sla_deadline',
  'is_overdue',
].sort()

describe('complaintHandlers', () => {
  let client

  beforeEach(() => {
    localStorage.clear()
    client = axios.create({
      adapter: createMockAdapter([...workerRoutes, ...complaintRoutes], { delayMs: 0 }),
    })
  })

  afterEach(() => {
    resetMockTasks()
    resetMockWorkers()
    uninstallMockApi()
  })

  describe('authentication and authorization across all complaint routes', () => {
    const routes = [
      { name: 'GET detail', method: 'get', url: '/complaints/t1', data: undefined },
      { name: 'PATCH start', method: 'patch', url: '/complaints/t1/start', data: undefined },
      {
        name: 'PATCH complete',
        method: 'patch',
        url: '/complaints/t1/complete',
        data: {
          photo: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
          note: 'Valid note for resolution',
        },
      },
      {
        name: 'PATCH defer',
        method: 'patch',
        url: '/complaints/t1/defer',
        data: { reason: 'Valid defer reason' },
      },
    ]

    for (const r of routes) {
      it(`${r.name} rejects with 401 when no token is provided`, async () => {
        const req = r.method === 'get' ? client.get(r.url) : client[r.method](r.url, r.data)
        await expect(req).rejects.toMatchObject({
          response: {
            status: 401,
            data: { detail: 'Not authenticated' },
          },
        })
      })

      it(`${r.name} rejects with 403 when authenticated as admin`, async () => {
        const config = { headers: { Authorization: 'Bearer mock-token-admin-1' } }
        const req =
          r.method === 'get' ? client.get(r.url, config) : client[r.method](r.url, r.data, config)
        await expect(req).rejects.toMatchObject({
          response: {
            status: 403,
            data: { detail: 'Not enough permissions' },
          },
        })
      })
    }
  })

  describe('GET /complaints/:id', () => {
    it('returns exactly the 11 contract keys for an assigned active task', async () => {
      const res = await client.get('/complaints/t1', {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })

      expect(res.status).toBe(200)
      expect(Object.keys(res.data).sort()).toEqual(CONTRACT_KEYS)
      expect(res.data.id).toBe('t1')
      expect(res.data.status).toBe('Submitted')
      expect(res.data.worker_id).toBeUndefined()
      expect(res.data.carry_forward_count).toBeUndefined()
      expect(res.data.dueInHours).toBeUndefined()
    })

    it('rejects with 404 when complaint belongs to another worker', async () => {
      await expect(
        client.get('/complaints/t6', {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { detail: 'Complaint not found' },
        },
      })
    })

    it('rejects with 404 when complaint id is unknown', async () => {
      await expect(
        client.get('/complaints/unknown-id', {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { detail: 'Complaint not found' },
        },
      })
    })
  })

  describe('PATCH /complaints/:id/start', () => {
    it('starts a Submitted task, updating its status to In-Progress and reflecting in list', async () => {
      const res = await client.patch(
        '/complaints/t1/start',
        {},
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      )

      expect(res.status).toBe(200)
      expect(res.data.id).toBe('t1')
      expect(res.data.status).toBe('In-Progress')
      expect(Object.keys(res.data).sort()).toEqual(CONTRACT_KEYS)

      const listRes = await client.get('/workers/me/tasks', {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })
      const t1InList = listRes.data.items.find((item) => item.id === 't1')
      expect(t1InList).toBeDefined()
      expect(t1InList.status).toBe('In-Progress')
    })

    it('rejects with 409 when starting a task already In-Progress', async () => {
      await expect(
        client.patch(
          '/complaints/t2/start',
          {},
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: { detail: 'Complaint cannot be started in its current state' },
        },
      })
    })

    it('rejects with 409 when starting a task twice', async () => {
      await client.patch(
        '/complaints/t1/start',
        {},
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      )

      await expect(
        client.patch(
          '/complaints/t1/start',
          {},
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: { detail: 'Complaint cannot be started in its current state' },
        },
      })
    })

    it('rejects with 404 when starting a task assigned to another worker', async () => {
      await expect(
        client.patch(
          '/complaints/t3/start',
          {},
          { headers: { Authorization: 'Bearer mock-token-worker-102' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { detail: 'Complaint not found' },
        },
      })
    })

    it('rejects with 500 when starting task t4 (deliberate failure demo)', async () => {
      await expect(
        client.patch(
          '/complaints/t4/start',
          {},
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      })
    })
  })

  describe('PATCH /complaints/:id/complete', () => {
    it('completes an In-Progress task with valid photo and note, updates resolutions and list', async () => {
      const formData = new FormData()
      const photo = new File(['image-data'], 'fix.jpg', { type: 'image/jpeg' })
      formData.append('photo', photo)
      formData.append('note', 'Repaired pothole with cold mix asphalt')

      const res = await client.patch('/complaints/t2/complete', formData, {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })

      expect(res.status).toBe(200)
      expect(res.data.id).toBe('t2')
      expect(res.data.status).toBe('Completed')
      expect(Object.keys(res.data).sort()).toEqual(CONTRACT_KEYS)

      const listRes = await client.get('/workers/me/tasks', {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })
      expect(listRes.data.items.some((item) => item.id === 't2')).toBe(false)

      await expect(
        client.get('/complaints/t2', {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { detail: 'Complaint not found' },
        },
      })

      expect(MOCK_RESOLUTIONS.length).toBe(1)
      const resolution = MOCK_RESOLUTIONS[0]
      expect(resolution.complaint_id).toBe('t2')
      expect(resolution.worker_id).toBe('101')
      expect(resolution.note).toBe('Repaired pothole with cold mix asphalt')
      expect(resolution.photo_name).toBe('fix.jpg')
      expect(resolution.photo_type).toBe('image/jpeg')
      expect(resolution.photo).toBeUndefined()
    })

    it('rejects with 409 when completing a Submitted task (t3)', async () => {
      const formData = new FormData()
      formData.append('photo', new File(['x'], 'fix.jpg', { type: 'image/jpeg' }))
      formData.append('note', 'Valid resolution note text')

      await expect(
        client.patch('/complaints/t3/complete', formData, {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: { detail: 'Complaint must be started before it can be completed' },
        },
      })
    })

    it('rejects with 422 when photo has text/plain mime type', async () => {
      const formData = new FormData()
      formData.append('photo', new File(['x'], 'notes.txt', { type: 'text/plain' }))
      formData.append('note', 'Valid resolution note text')

      await expect(
        client.patch('/complaints/t2/complete', formData, {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: {
            detail: [{ loc: ['body', 'photo'], msg: 'Photo must be a JPG, PNG or WebP image.' }],
          },
        },
      })
    })

    it('rejects with 422 when photo exceeds 8 MB', async () => {
      const file = new File(['x'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 9 * 1024 * 1024 })
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('note', 'Valid resolution note text')

      await expect(
        client.patch('/complaints/t2/complete', formData, {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: {
            detail: [{ loc: ['body', 'photo'], msg: 'Photo must be 8 MB or smaller.' }],
          },
        },
      })
    })

    it('rejects with 422 when note is only 3 characters', async () => {
      const formData = new FormData()
      formData.append('photo', new File(['x'], 'fix.jpg', { type: 'image/jpeg' }))
      formData.append('note', 'fix')

      await expect(
        client.patch('/complaints/t2/complete', formData, {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: {
            detail: [{ loc: ['body', 'note'], msg: 'Note must be 10 to 500 characters' }],
          },
        },
      })
    })

    it('rejects with 422 listing both photo and note fields exactly once when both are invalid', async () => {
      const body = { note: 'bad' }

      await expect(
        client.patch('/complaints/t2/complete', body, {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'photo'], msg: 'Choose a photo.' },
              { loc: ['body', 'note'], msg: 'Note must be 10 to 500 characters' },
            ],
          },
        },
      })
    })
  })

  describe('PATCH /complaints/:id/defer', () => {
    it('defers a Submitted task (t3), increments carry_forward, clears worker_id, and keeps status Submitted', async () => {
      const res = await client.patch(
        '/complaints/t3/defer',
        { reason: 'Road blocked by a parked truck' },
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      )

      expect(res.status).toBe(200)
      expect(res.data.id).toBe('t3')
      expect(res.data.status).toBe('Submitted')
      expect(Object.keys(res.data).sort()).toEqual(CONTRACT_KEYS)
      expect(res.data.worker_id).toBeUndefined()
      expect(res.data.carry_forward_count).toBeUndefined()
      expect(res.data.dueInHours).toBeUndefined()
      expect(res.data.reason).toBeUndefined()

      const taskInMock = MOCK_TASKS.find((t) => t.id === 't3')
      expect(taskInMock.carry_forward_count).toBe(1)
      expect(taskInMock.worker_id).toBe('')
      expect(taskInMock.status).toBe('Submitted')

      const listRes = await client.get('/workers/me/tasks', {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })
      expect(listRes.data.items.some((item) => item.id === 't3')).toBe(false)

      await expect(
        client.get('/complaints/t3', {
          headers: { Authorization: 'Bearer mock-token-worker-101' },
        }),
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { detail: 'Complaint not found' },
        },
      })
    })

    it('defers an In-Progress task (t2), reverting its status to Submitted', async () => {
      const res = await client.patch(
        '/complaints/t2/defer',
        { reason: 'Heavy excavation equipment required' },
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      )

      expect(res.status).toBe(200)
      expect(res.data.id).toBe('t2')
      expect(res.data.status).toBe('Submitted')

      const taskInMock = MOCK_TASKS.find((t) => t.id === 't2')
      expect(taskInMock.status).toBe('Submitted')
      expect(taskInMock.worker_id).toBe('')
      expect(taskInMock.carry_forward_count).toBe(1)
    })

    it('rejects with 422 when defer reason is under 5 characters', async () => {
      await expect(
        client.patch(
          '/complaints/t3/defer',
          { reason: 'no' },
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: {
            detail: [{ loc: ['body', 'reason'], msg: 'Reason must be 5 to 300 characters' }],
          },
        },
      })
    })

    it('rejects with 409 when deferring a Completed task', async () => {
      const formData = new FormData()
      formData.append('photo', new File(['x'], 'fix.jpg', { type: 'image/jpeg' }))
      formData.append('note', 'Repaired pothole with asphalt')
      await client.patch('/complaints/t2/complete', formData, {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })

      await expect(
        client.patch(
          '/complaints/t2/defer',
          { reason: 'Attempting to defer a completed task' },
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: { detail: 'Completed complaints cannot be deferred' },
        },
      })
    })

    it('rejects with 500 when deferring task t4 (deliberate failure demo)', async () => {
      await expect(
        client.patch(
          '/complaints/t4/defer',
          { reason: 'Needs high reach bucket truck' },
          { headers: { Authorization: 'Bearer mock-token-worker-101' } },
        ),
      ).rejects.toMatchObject({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      })
    })
  })

  describe('resetMockTasks', () => {
    it('restores original tasks in place and empties MOCK_RESOLUTIONS', async () => {
      await client.patch(
        '/complaints/t1/start',
        {},
        { headers: { Authorization: 'Bearer mock-token-worker-101' } },
      )

      const formData = new FormData()
      formData.append('photo', new File(['x'], 'fix.jpg', { type: 'image/jpeg' }))
      formData.append('note', 'Repaired pothole with asphalt')
      await client.patch('/complaints/t2/complete', formData, {
        headers: { Authorization: 'Bearer mock-token-worker-101' },
      })

      expect(MOCK_RESOLUTIONS.length).toBe(1)

      resetMockTasks()

      expect(MOCK_RESOLUTIONS.length).toBe(0)
      const t1 = MOCK_TASKS.find((t) => t.id === 't1')
      expect(t1.status).toBe('Submitted')
      const t2 = MOCK_TASKS.find((t) => t.id === 't2')
      expect(t2.status).toBe('In-Progress')
      expect(t2.worker_id).toBe('101')
      expect(t2.carry_forward_count).toBe(0)
    })
  })
})
