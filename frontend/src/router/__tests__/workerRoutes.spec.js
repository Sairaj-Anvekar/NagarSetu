import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../index'
import { saveAuth } from '../../utils/authStorage'

describe('Worker routes', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.push('/login')
    await router.isReady()
  })

  afterEach(async () => {
    await router.push('/login')
    localStorage.clear()
  })

  it('redirects a logged-out visit to /worker/account to login with the redirect query', async () => {
    await router.push('/worker/account')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/worker/account')
  })

  it.each(['/worker', '/worker/history', '/worker/account'])(
    'allows a worker session to access %s',
    async (path) => {
      saveAuth({
        token: 'worker-test-token',
        role: 'worker',
        user: { id: '101', name: 'Ravi Patil', role: 'worker' },
      })
      await router.push(path)

      expect(router.currentRoute.value.path).toBe(path)
      expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
      expect(router.currentRoute.value.meta.role).toBe('worker')
    },
  )

  it('redirects an admin session pushing /worker/history to /admin', async () => {
    saveAuth({
      token: 'admin-test-token',
      role: 'admin',
      user: { id: '1', name: 'Demo Admin', role: 'admin' },
    })
    await router.push('/worker/history')

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('inherits noNavbar on the worker routes', () => {
    expect(router.resolve('/worker').meta.noNavbar).toBe(true)
    expect(router.resolve('/worker/history').meta.noNavbar).toBe(true)
    expect(router.resolve('/worker/account').meta.noNavbar).toBe(true)
  })
})
