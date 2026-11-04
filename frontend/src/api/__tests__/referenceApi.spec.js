import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fetchDepartments, fetchZones, normalizeOption } from '../referenceApi'
import http from '../http'
import { installMockApi, uninstallMockApi } from '../mock'
import { saveAuth } from '../../utils/authStorage'

describe('normalizeOption', () => {
  it('converts numeric id to string and keeps name', () => {
    const raw = { id: 1, name: 'Solid Waste Management' }
    expect(normalizeOption(raw)).toEqual({
      id: '1',
      name: 'Solid Waste Management',
    })
  })

  it('handles null safely without throwing', () => {
    expect(normalizeOption(null)).toEqual({
      id: '',
      name: '',
    })
  })

  it('defaults name to empty string when missing', () => {
    expect(normalizeOption({ id: 'z1' })).toEqual({
      id: 'z1',
      name: '',
    })
  })
})

describe('referenceApi HTTP requests', () => {
  beforeEach(() => {
    localStorage.clear()
    installMockApi({ delayMs: 0 })
  })

  afterEach(() => {
    uninstallMockApi()
    localStorage.clear()
  })

  it('fetches 8 departments and 4 zones when authenticated as admin', async () => {
    saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

    const departments = await fetchDepartments()
    expect(departments).toHaveLength(8)
    expect(departments[0]).toHaveProperty('id')
    expect(departments[0]).toHaveProperty('name')

    const zones = await fetchZones()
    expect(zones).toHaveLength(4)
    expect(zones[0]).toHaveProperty('id')
    expect(zones[0]).toHaveProperty('name')
  })

  it('rejects with 401 when no auth is saved', async () => {
    await expect(fetchDepartments()).rejects.toMatchObject({
      response: { status: 401 },
    })

    await expect(fetchZones()).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('rejects with 403 when authenticated as a worker', async () => {
    saveAuth({ token: 'mock-token-worker-101', role: 'worker', user: null })

    await expect(fetchDepartments()).rejects.toMatchObject({
      response: { status: 403 },
    })

    await expect(fetchZones()).rejects.toMatchObject({
      response: { status: 403 },
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
      await expect(fetchDepartments()).rejects.toThrow('Unexpected response from the server')
      await expect(fetchZones()).rejects.toThrow('Unexpected response from the server')
    } finally {
      http.defaults.adapter = originalAdapter
    }
  })
})

