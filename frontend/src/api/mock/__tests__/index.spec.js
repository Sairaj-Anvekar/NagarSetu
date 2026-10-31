import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import http from '../../http'
import { loginAdmin, loginWorker } from '../../authApi'
import { useAuthStore } from '../../../stores/auth'
import { installMockApi, uninstallMockApi } from '../index'

describe('mock API installer and integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    uninstallMockApi()
    localStorage.clear()
  })

  it('restores the original adapter after uninstallMockApi', () => {
    const originalAdapter = http.defaults.adapter
    installMockApi({ delayMs: 0 })
    expect(http.defaults.adapter).not.toBe(originalAdapter)

    uninstallMockApi()
    expect(http.defaults.adapter).toBe(originalAdapter)
  })

  it('allows real loginAdmin from authApi.js to resolve with token, role, and user', async () => {
    installMockApi({ delayMs: 0 })
    const result = await loginAdmin({ username: 'admin', password: 'admin123' })

    expect(result).toEqual({
      token: 'mock-token-admin-1',
      role: 'admin',
      user: {
        id: '1',
        name: 'Demo Admin',
        role: 'admin'
      }
    })
  })

  it('causes real loginWorker with wrong PIN to reject with 401', async () => {
    installMockApi({ delayMs: 0 })

    await expect(loginWorker({ phone: '9876543210', pin: '0000' })).rejects.toMatchObject({
      response: {
        status: 401,
        data: { detail: 'Incorrect credentials' }
      }
    })
  })

  it('integrates with useAuthStore().loginWorker to authenticate the store with worker role', async () => {
    installMockApi({ delayMs: 0 })
    const store = useAuthStore()

    expect(store.isAuthenticated).toBe(false)
    await store.loginWorker({ phone: '9876543210', pin: '1234' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.isWorker).toBe(true)
    expect(store.role).toBe('worker')
    expect(store.user.name).toBe('Ravi Patil')
    expect(store.token).toBe('mock-token-worker-101')
  })
})
