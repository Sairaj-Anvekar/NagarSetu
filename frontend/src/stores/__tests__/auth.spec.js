import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { saveAuth } from '../../utils/authStorage'
import http, { setUnauthorizedHandler } from '../../api/http'

// Mock the entire authApi module — real network calls must never happen in tests
vi.mock('../../api/authApi')

// Import the mocked API functions so individual tests can configure their behaviour
import { loginAdmin as mockLoginAdmin, loginWorker as mockLoginWorker } from '../../api/authApi'

// Import the store AFTER mocking so it picks up the mock
import { useAuthStore, registerUnauthorizedHandler } from '../auth'

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.resetAllMocks()
})

// ---------------------------------------------------------------------------
// Part 1: initialisation, getters, logout
// ---------------------------------------------------------------------------

describe('auth store — initialisation', () => {
  it('starts logged out when localStorage is empty', () => {
    const store = useAuthStore()

    expect(store.token).toBeNull()
    expect(store.role).toBeNull()
    expect(store.user).toBeNull()
  })

  it('restores token, role and user from a valid stored session', () => {
    const fakeUser = { id: 7, name: 'Alice' }
    saveAuth({ token: 'saved-tok', role: 'admin', user: fakeUser })

    const store = useAuthStore()

    expect(store.token).toBe('saved-tok')
    expect(store.role).toBe('admin')
    expect(store.user).toEqual(fakeUser)
  })

  it('treats a stored session with role "worker" as valid', () => {
    saveAuth({ token: 'worker-tok', role: 'worker', user: null })

    const store = useAuthStore()

    expect(store.token).toBe('worker-tok')
    expect(store.role).toBe('worker')
  })

  it('starts logged out and clears storage when the stored role is invalid', () => {
    saveAuth({ token: 'bad-tok', role: 'superuser', user: null })

    const store = useAuthStore()

    // Store must be wiped
    expect(store.token).toBeNull()
    expect(store.role).toBeNull()
    expect(store.user).toBeNull()

    // localStorage must also have been cleared
    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
  })
})

describe('auth store — getters', () => {
  it('isAuthenticated is false when logged out', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAuthenticated is true when a token is present', () => {
    saveAuth({ token: 'tok', role: 'admin', user: null })
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(true)
  })

  it('isAdmin is true only for an authenticated admin', () => {
    saveAuth({ token: 'tok', role: 'admin', user: null })
    const store = useAuthStore()
    expect(store.isAdmin).toBe(true)
    expect(store.isWorker).toBe(false)
  })

  it('isWorker is true only for an authenticated worker', () => {
    saveAuth({ token: 'tok', role: 'worker', user: null })
    const store = useAuthStore()
    expect(store.isWorker).toBe(true)
    expect(store.isAdmin).toBe(false)
  })

  it('isAdmin and isWorker are both false when logged out', () => {
    const store = useAuthStore()
    expect(store.isAdmin).toBe(false)
    expect(store.isWorker).toBe(false)
  })
})

describe('auth store — logout', () => {
  it('resets all state refs to null', () => {
    saveAuth({ token: 'tok', role: 'admin', user: { id: 1 } })
    const store = useAuthStore()

    store.logout()

    expect(store.token).toBeNull()
    expect(store.role).toBeNull()
    expect(store.user).toBeNull()
  })

  it('clears localStorage on logout', () => {
    saveAuth({ token: 'tok', role: 'admin', user: null })
    const store = useAuthStore()

    store.logout()

    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
  })

  it('isAuthenticated becomes false after logout', () => {
    saveAuth({ token: 'tok', role: 'admin', user: null })
    const store = useAuthStore()

    store.logout()

    expect(store.isAuthenticated).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Part 2: loginAdmin, loginWorker, registerUnauthorizedHandler
// ---------------------------------------------------------------------------

describe('auth store — loginAdmin', () => {
  it('sets state, persists to localStorage, and makes isAdmin true on success', async () => {
    mockLoginAdmin.mockResolvedValue({ token: 'admin-tok', role: 'admin', user: { id: 1 } })
    const store = useAuthStore()

    await store.loginAdmin({ username: 'alice', password: 'secret' })

    expect(store.token).toBe('admin-tok')
    expect(store.role).toBe('admin')
    expect(store.user).toEqual({ id: 1 })
    expect(store.isAdmin).toBe(true)
    expect(localStorage.getItem('nagarsetu_auth')).not.toBeNull()
  })

  it('leaves the store logged out and writes nothing to storage when the API throws', async () => {
    mockLoginAdmin.mockRejectedValue(new Error('wrong credentials'))
    const store = useAuthStore()

    await expect(store.loginAdmin({ username: 'bad', password: 'bad' })).rejects.toThrow(
      'wrong credentials',
    )

    expect(store.token).toBeNull()
    expect(store.role).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
  })

  it('re-throws the exact error object from the API', async () => {
    const err = new Error('Server error')
    mockLoginAdmin.mockRejectedValue(err)
    const store = useAuthStore()

    await expect(store.loginAdmin({ username: 'a', password: 'b' })).rejects.toBe(err)
  })
})

describe('auth store — loginWorker', () => {
  it('sets state, persists to localStorage, and makes isWorker true on success', async () => {
    mockLoginWorker.mockResolvedValue({ token: 'worker-tok', role: 'worker', user: { id: 2 } })
    const store = useAuthStore()

    await store.loginWorker({ phone: '9876543210', pin: '1234' })

    expect(store.token).toBe('worker-tok')
    expect(store.role).toBe('worker')
    expect(store.user).toEqual({ id: 2 })
    expect(store.isWorker).toBe(true)
    expect(localStorage.getItem('nagarsetu_auth')).not.toBeNull()
  })

  it('leaves the store logged out and writes nothing to storage when the API throws', async () => {
    mockLoginWorker.mockRejectedValue(new Error('wrong pin'))
    const store = useAuthStore()

    await expect(store.loginWorker({ phone: '1234567890', pin: '9999' })).rejects.toThrow(
      'wrong pin',
    )

    expect(store.token).toBeNull()
    expect(store.isWorker).toBe(false)
    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
  })

  it('re-throws the exact error object from the API', async () => {
    const err = new Error('Network error')
    mockLoginWorker.mockRejectedValue(err)
    const store = useAuthStore()

    await expect(store.loginWorker({ phone: 'x', pin: '0000' })).rejects.toBe(err)
  })
})

describe('auth store — registerUnauthorizedHandler', () => {
  let originalAdapter

  beforeEach(() => {
    originalAdapter = http.defaults.adapter
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    setUnauthorizedHandler(null)
  })

  it('logs the store out and calls router.push({ path: "/login", query: { reason: "expired" } }) on a 401', async () => {
    // Start with a valid logged-in session
    saveAuth({ token: 'live-tok', role: 'admin', user: null })
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(true)

    const fakeRouter = { push: vi.fn() }
    registerUnauthorizedHandler(fakeRouter)

    // Fake adapter that always rejects with a 401 (no skipAuthRedirect)
    http.defaults.adapter = async (config) => {
      const response = { status: 401, data: {}, headers: {}, config }
      throw new AxiosError('Unauthorized', 'ERR_BAD_RESPONSE', config, null, response)
    }

    await expect(http.get('/protected')).rejects.toThrow()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(fakeRouter.push).toHaveBeenCalledOnce()
    expect(fakeRouter.push).toHaveBeenCalledWith({ path: '/login', query: { reason: 'expired' } })
  })
})
