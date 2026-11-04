import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fetchWorkers, normalizeWorker, setWorkerActive } from '../workersApi'
import http from '../http'
import { installMockApi, uninstallMockApi } from '../mock'
import { resetMockWorkers } from '../mock/mockData'
import { saveAuth } from '../../utils/authStorage'

describe('normalizeWorker', () => {
  it('normalizes a worker with string department and zone', () => {
    const raw = {
      id: '101',
      name: 'Ravi Patil',
      phone: '+919876543210',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    }
    expect(normalizeWorker(raw)).toEqual({
      id: '101',
      name: 'Ravi Patil',
      phone: '+919876543210',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    })
  })

  it('normalizes a worker with object department and zone', () => {
    const raw = {
      id: '102',
      name: 'Anita Sharma',
      phone: '+919123456780',
      department: { id: 'd2', name: 'Water Supply Board' },
      zone: { id: 'z2', name: 'Zone B' },
      is_active: true,
    }
    expect(normalizeWorker(raw)).toEqual({
      id: '102',
      name: 'Anita Sharma',
      phone: '+919123456780',
      department: 'Water Supply Board',
      zone: 'Zone B',
      is_active: true,
    })
  })

  it('converts numeric id to string', () => {
    const raw = { id: 103, name: 'Deactivated Worker' }
    expect(normalizeWorker(raw).id).toBe('103')
  })

  it('handles null safely without throwing', () => {
    expect(normalizeWorker(null)).toEqual({
      id: '',
      name: '',
      phone: '',
      department: '',
      zone: '',
      is_active: false,
    })
  })

  it('defaults is_active to false when missing', () => {
    const raw = { id: '104', name: 'Worker' }
    expect(normalizeWorker(raw).is_active).toBe(false)
  })
})

describe('workersApi HTTP requests', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockWorkers()
    installMockApi({ delayMs: 0 })
  })

  afterEach(() => {
    uninstallMockApi()
    resetMockWorkers()
    localStorage.clear()
  })

  it('resolves 8 normalized workers when authenticated as admin', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    const res = await fetchWorkers()
    expect(res.total).toBe(8)
    expect(res.items).toHaveLength(8)
    expect(res.items[0]).toEqual({
      id: '101',
      name: 'Ravi Patil',
      phone: '+919876543210',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    })
  })

  it('rejects with 401 when no auth is saved', async () => {
    await expect(fetchWorkers()).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('rejects with 403 when authenticated as a worker', async () => {
    saveAuth({ token: 'mock-token-worker-101', role: 'worker', user: null })

    await expect(fetchWorkers()).rejects.toMatchObject({
      response: { status: 403 },
    })
  })

  it('setWorkerActive resolves worker with is_active false', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    const res = await setWorkerActive('101', false)
    expect(res.id).toBe('101')
    expect(res.is_active).toBe(false)
  })

  it('setWorkerActive rejects with 404 for unknown worker id', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    await expect(setWorkerActive('999', false)).rejects.toMatchObject({
      response: { status: 404 },
    })
  })

  it('setWorkerActive rejects with 500 when targeting worker 105', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    await expect(setWorkerActive('105', false)).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('throws unexpected response error when data.items is not an array', async () => {
    const originalAdapter = http.defaults.adapter
    http.defaults.adapter = async () => ({
      data: { nope: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    })

    try {
      await expect(fetchWorkers()).rejects.toThrow('Unexpected response from the server')
    } finally {
      http.defaults.adapter = originalAdapter
    }
  })
})

