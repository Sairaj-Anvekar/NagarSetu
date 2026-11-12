import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { saveAuth } from '../../utils/authStorage'
import router from '../index'

describe('router — worker task detail route', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.push('/login')
  })

  it('resolves /worker/tasks/abc to worker-task-detail with inherited worker meta', () => {
    const resolved = router.resolve('/worker/tasks/abc')

    expect(resolved.name).toBe('worker-task-detail')
    expect(resolved.params).toEqual({ id: 'abc' })
    expect(resolved.meta).toMatchObject({
      requiresAuth: true,
      role: 'worker',
      noNavbar: true,
    })
  })

  it('redirects an anonymous user from /worker/tasks/abc to /login with redirect query', async () => {
    await router.push('/worker/tasks/abc')

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/worker/tasks/abc')
  })

  it('redirects an admin user from /worker/tasks/abc to /admin', async () => {
    saveAuth({ token: 'admin-token', role: 'admin', user: { id: '1', role: 'admin' } })
    setActivePinia(createPinia())

    await router.push('/worker/tasks/abc')

    expect(router.currentRoute.value.fullPath).toBe('/admin')
  })

  it('allows an authenticated worker to visit /worker/tasks/abc', async () => {
    saveAuth({ token: 'worker-token', role: 'worker', user: { id: '2', role: 'worker' } })
    setActivePinia(createPinia())

    await router.push('/worker/tasks/abc')

    expect(router.currentRoute.value.name).toBe('worker-task-detail')
    expect(router.currentRoute.value.fullPath).toBe('/worker/tasks/abc')
  })
})

