import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { workerRoutes } from '../workerHandlers'
import { MOCK_TASKS } from '../mockData'

describe('workerHandlers - authentication and error states', () => {
  const client = axios.create({
    adapter: createMockAdapter(workerRoutes, { delayMs: 0 })
  })

  it('rejects with 401 when no authorization header is provided', async () => {
    await expect(client.get('/workers/me/tasks')).rejects.toMatchObject({
      response: {
        status: 401,
        data: { detail: 'Not authenticated' }
      }
    })
  })

  it('rejects with 403 when authenticated as admin', async () => {
    await expect(
      client.get('/workers/me/tasks', {
        headers: { Authorization: 'Bearer mock-token-admin-1' }
      })
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { detail: 'Not enough permissions' }
      }
    })
  })

  it('rejects with 500 for worker 105 error simulation', async () => {
    await expect(
      client.get('/workers/me/tasks', {
        headers: { Authorization: 'Bearer mock-token-worker-105' }
      })
    ).rejects.toMatchObject({
      response: {
        status: 500,
        data: { detail: 'Internal server error' }
      }
    })
  })

  it('returns empty task queue for worker 104', async () => {
    const res = await client.get('/workers/me/tasks', {
      headers: { Authorization: 'Bearer mock-token-worker-104' }
    })
    expect(res.status).toBe(200)
    expect(res.data).toEqual({
      items: [],
      total: 0,
      page: 1,
      page_size: 20
    })
  })
})

describe('workerHandlers - task queue and contract compliance', () => {
  const client = axios.create({
    adapter: createMockAdapter(workerRoutes, { delayMs: 0 })
  })

  const EXPECTED_KEYS = [
    'category',
    'description',
    'id',
    'image_url',
    'is_overdue',
    'latitude',
    'longitude',
    'priority',
    'sla_deadline',
    'status',
    'tracking_code'
  ].sort()

  it('returns worker 101 tasks in correct queue order with pagination meta', async () => {
    const res = await client.get('/workers/me/tasks', {
      headers: { Authorization: 'Bearer mock-token-worker-101' }
    })

    expect(res.status).toBe(200)
    expect(res.data.total).toBe(5)
    expect(res.data.page).toBe(1)
    expect(res.data.page_size).toBe(20)
    expect(res.data.items.map((t) => t.id)).toEqual(['t1', 't5', 't2', 't3', 't4'])
  })

  it('returns worker 102 tasks in correct priority order', async () => {
    const res = await client.get('/workers/me/tasks', {
      headers: { Authorization: 'Bearer mock-token-worker-102' }
    })

    expect(res.status).toBe(200)
    expect(res.data.total).toBe(2)
    expect(res.data.items.map((t) => t.id)).toEqual(['t6', 't7'])
  })

  it('strictly adheres to the 11 contract keys and privacy rules', async () => {
    const now = Date.now()
    const res = await client.get('/workers/me/tasks', {
      headers: { Authorization: 'Bearer mock-token-worker-101' }
    })

    for (const item of res.data.items) {
      expect(Object.keys(item).sort()).toEqual(EXPECTED_KEYS)
      expect(['Submitted', 'In-Progress']).toContain(item.status)
      expect(['critical', 'high', 'medium', 'low']).toContain(item.priority)
      expect(typeof item.id).toBe('string')
      expect(typeof item.tracking_code).toBe('string')
      expect(item.image_url).toBeNull()

      const deadline = new Date(item.sla_deadline)
      expect(Number.isNaN(deadline.getTime())).toBe(false)
      expect(item.sla_deadline).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(item.is_overdue).toBe(deadline.getTime() < now)

      expect(item).not.toHaveProperty('worker_id')
      expect(item).not.toHaveProperty('dueInHours')

      for (const key of Object.keys(item)) {
        expect(key).not.toMatch(/phone|citizen|telegram|chat|name|worker/i)
      }
    }
  })

  it('does not mutate original MOCK_TASKS array', async () => {
    const originalIds = MOCK_TASKS.map((t) => t.id)
    const originalLength = MOCK_TASKS.length

    await client.get('/workers/me/tasks', {
      headers: { Authorization: 'Bearer mock-token-worker-101' }
    })

    expect(MOCK_TASKS.length).toBe(originalLength)
    expect(MOCK_TASKS.map((t) => t.id)).toEqual(originalIds)
  })
})

