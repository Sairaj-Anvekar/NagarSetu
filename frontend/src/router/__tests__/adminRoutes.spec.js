import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../index'
import { saveAuth } from '../../utils/authStorage'

describe('Admin routes', () => {
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

  it.each(['/admin', '/admin/workers'])('allows an admin session to access %s', async (path) => {
    saveAuth({
      token: 'admin-routes-test-token',
      role: 'admin',
      user: { id: '1', name: 'Demo Admin', role: 'admin' },
    })
    await router.push(path)

    expect(router.currentRoute.value.path).toBe(path)
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
    expect(router.currentRoute.value.meta.role).toBe('admin')
  })

  it('redirects a worker session away from the admin dashboard', async () => {
    saveAuth({
      token: 'worker-routes-test-token',
      role: 'worker',
      user: { id: '101', name: 'Demo Worker', role: 'worker' },
    })
    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/worker')
  })

  it('inherits noNavbar on the Workers route', () => {
    expect(router.resolve('/admin/workers').meta.noNavbar).toBe(true)
  })

  it('redirects a logged-out visit to Workers to login with the original destination', async () => {
    await router.push('/admin/workers')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/workers')
  })

  it('allows an admin session to load /admin/workers/new with route name admin-worker-new', async () => {
    saveAuth({
      token: 'admin-routes-test-token',
      role: 'admin',
      user: { id: '1', name: 'Demo Admin', role: 'admin' },
    })
    await router.push('/admin/workers/new')

    expect(router.currentRoute.value.path).toBe('/admin/workers/new')
    expect(router.currentRoute.value.name).toBe('admin-worker-new')
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
    expect(router.currentRoute.value.meta.role).toBe('admin')
  })

  it('redirects a logged-out visit to /admin/workers/new to login with redirect parameter', async () => {
    await router.push('/admin/workers/new')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/workers/new')
  })

  it('redirects a worker session pushing /admin/workers/new to /worker', async () => {
    saveAuth({
      token: 'worker-routes-test-token',
      role: 'worker',
      user: { id: '101', name: 'Demo Worker', role: 'worker' },
    })
    await router.push('/admin/workers/new')

    expect(router.currentRoute.value.path).toBe('/worker')
  })

  it('resolves /admin/complaints with route name admin-complaints and inherited meta', () => {
    const resolved = router.resolve('/admin/complaints')

    expect(resolved.name).toBe('admin-complaints')
    expect(resolved.meta).toMatchObject({
      requiresAuth: true,
      role: 'admin',
      noNavbar: true,
    })
  })

  it('allows an admin session to load /admin/complaints', async () => {
    saveAuth({
      token: 'admin-routes-test-token',
      role: 'admin',
      user: { id: '1', name: 'Demo Admin', role: 'admin' },
    })
    await router.push('/admin/complaints')

    expect(router.currentRoute.value.path).toBe('/admin/complaints')
    expect(router.currentRoute.value.name).toBe('admin-complaints')
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
    expect(router.currentRoute.value.meta.role).toBe('admin')
  })

  it('redirects a logged-out visit to /admin/complaints to login with redirect parameter', async () => {
    await router.push('/admin/complaints')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/complaints')
  })

  it('redirects a worker session pushing /admin/complaints to /worker', async () => {
    saveAuth({
      token: 'worker-routes-test-token',
      role: 'worker',
      user: { id: '101', name: 'Demo Worker', role: 'worker' },
    })
    await router.push('/admin/complaints')

    expect(router.currentRoute.value.path).toBe('/worker')
  })

  it('resolves /admin/complaints/:id with route name admin-complaint-detail and inherited meta', () => {
    const resolved = router.resolve('/admin/complaints/c-123')

    expect(resolved.name).toBe('admin-complaint-detail')
    expect(resolved.params.id).toBe('c-123')
    expect(resolved.meta).toMatchObject({
      requiresAuth: true,
      role: 'admin',
      noNavbar: true,
    })
  })

  it('redirects a logged-out visit to /admin/complaints/:id to login with redirect parameter', async () => {
    await router.push('/admin/complaints/c-123')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/complaints/c-123')
  })

  it('redirects a worker session pushing /admin/complaints/:id to /worker', async () => {
    saveAuth({
      token: 'worker-routes-test-token',
      role: 'worker',
      user: { id: '101', name: 'Demo Worker', role: 'worker' },
    })
    await router.push('/admin/complaints/c-123')

    expect(router.currentRoute.value.path).toBe('/worker')
  })
})


