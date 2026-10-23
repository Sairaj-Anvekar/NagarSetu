import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { saveAuth } from '../../utils/authStorage'
import { authGuard } from '../guards'

describe('authGuard — unit tests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('returns true on a public route without requiring an active Pinia', () => {
    setActivePinia(undefined)
    const to = { path: '/login', fullPath: '/login', meta: {} }
    expect(authGuard(to)).toBe(true)
  })

  it('redirects to /login with redirect query when logged out on a protected route', () => {
    const to = {
      path: '/admin',
      fullPath: '/admin?page=1',
      meta: { requiresAuth: true, role: 'admin' },
    }
    expect(authGuard(to)).toEqual({ path: '/login', query: { redirect: '/admin?page=1' } })
  })

  it('returns true when admin accesses an admin route', () => {
    saveAuth({ token: 't', role: 'admin', user: null })
    setActivePinia(createPinia())
    const to = { path: '/admin', fullPath: '/admin', meta: { requiresAuth: true, role: 'admin' } }
    expect(authGuard(to)).toBe(true)
  })

  it('returns true when worker accesses a worker route', () => {
    saveAuth({ token: 't', role: 'worker', user: null })
    setActivePinia(createPinia())
    const to = { path: '/worker', fullPath: '/worker', meta: { requiresAuth: true, role: 'worker' } }
    expect(authGuard(to)).toBe(true)
  })

  it('redirects worker to /worker when attempting to access an admin route', () => {
    saveAuth({ token: 't', role: 'worker', user: null })
    setActivePinia(createPinia())
    const to = { path: '/admin', fullPath: '/admin', meta: { requiresAuth: true, role: 'admin' } }
    expect(authGuard(to)).toBe('/worker')
  })

  it('redirects admin to /admin when attempting to access a worker route', () => {
    saveAuth({ token: 't', role: 'admin', user: null })
    setActivePinia(createPinia())
    const to = { path: '/worker', fullPath: '/worker', meta: { requiresAuth: true, role: 'worker' } }
    expect(authGuard(to)).toBe('/admin')
  })
})

describe('authGuard — router integration', () => {
  const ComponentStub = { template: '<div>Stub</div>' }

  function createTestRouter() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: ComponentStub },
        { path: '/admin', component: ComponentStub, meta: { requiresAuth: true, role: 'admin' } },
        { path: '/worker', component: ComponentStub, meta: { requiresAuth: true, role: 'worker' } },
      ],
    })
    router.beforeEach(authGuard)
    return router
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects logged-out push to /admin to /login?redirect=%2Fadmin', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/admin')
  })

  it('redirects worker push to /admin to /worker', async () => {
    saveAuth({ token: 't', role: 'worker', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.fullPath).toBe('/worker')
  })

  it('allows admin push to /admin to stay on /admin', async () => {
    saveAuth({ token: 't', role: 'admin', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.fullPath).toBe('/admin')
  })
})
