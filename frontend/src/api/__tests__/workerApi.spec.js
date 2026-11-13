import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import http from '../http'
import { installMockApi, uninstallMockApi } from '../mock'
import { saveAuth } from '../../utils/authStorage'
import { fetchMyHistory, fetchMyTasks } from '../workerApi'

describe('workerApi - fetchMyTasks authentication and success', () => {
  beforeEach(() => {
    localStorage.clear()
    installMockApi({ delayMs: 0 })
  })

  afterEach(() => {
    uninstallMockApi()
    localStorage.clear()
  })

  it('resolves with tasks for worker 101', async () => {
    saveAuth({ token: 'mock-token-worker-101', role: 'worker', user: null })

    const result = await fetchMyTasks()

    expect(result).toMatchObject({
      total: 5,
      page: 1,
      page_size: 20
    })
    expect(result.items).toHaveLength(5)
    expect(result.items[0]).toHaveProperty('tracking_code', 'GRV-2026-A7X3')
  })

  it('rejects with 401 when no auth token is stored', async () => {
    await expect(fetchMyTasks()).rejects.toMatchObject({
      response: {
        status: 401
      }
    })
  })

  it('rejects with 403 when an admin token is stored', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    await expect(fetchMyTasks()).rejects.toMatchObject({
      response: {
        status: 403
      }
    })
  })

  it('resolves with an empty list for worker 104', async () => {
    saveAuth({ token: 'mock-token-worker-104', role: 'worker', user: null })

    const result = await fetchMyTasks()

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      page_size: 20
    })
  })

  it('rejects with 500 for worker 105', async () => {
    saveAuth({ token: 'mock-token-worker-105', role: 'worker', user: null })

    await expect(fetchMyTasks()).rejects.toMatchObject({
      response: {
        status: 500
      }
    })
  })

  it('rejects with error when server returns unexpected response shape', async () => {
    const originalAdapter = http.defaults.adapter
    try {
      http.defaults.adapter = async (config) => ({
        data: { nope: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })

      await expect(fetchMyTasks()).rejects.toThrow('Unexpected response from the server')
    } finally {
      http.defaults.adapter = originalAdapter
    }
  })
})

describe('workerApi - fetchMyHistory', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('calls /workers/me/history with page and page_size and returns normalized envelope', async () => {
    let capturedConfig
    const sampleItems = [{ id: 'c-1', tracking_code: 'GRV-2026-H1', status: 'Completed' }]
    http.defaults.adapter = async (config) => {
      capturedConfig = config
      return {
        data: { items: sampleItems, total: 12, page: 2, page_size: 20 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
    }

    const result = await fetchMyHistory({ page: 2, pageSize: 20 })

    expect(capturedConfig.url).toBe('/workers/me/history')
    expect(capturedConfig.method).toBe('get')
    expect(capturedConfig.params).toEqual({ page: 2, page_size: 20 })
    expect(result).toEqual({ items: sampleItems, total: 12, page: 2, pageSize: 20 })
  })

  it('omits unset paging params and propagates HTTP and shape errors', async () => {
    let capturedConfig
    http.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: { invalid: true }, status: 200, statusText: 'OK', headers: {}, config }
    }

    await expect(fetchMyHistory()).rejects.toThrow('Unexpected response from the server')
    expect(capturedConfig.params).toEqual({})

    http.defaults.adapter = async (config) => {
      const error = new Error('Forbidden')
      error.response = { status: 403, data: { detail: 'Workers only' } }
      error.config = config
      throw error
    }

    await expect(fetchMyHistory({ page: 1 })).rejects.toMatchObject({
      response: { status: 403 }
    })
  })
})

