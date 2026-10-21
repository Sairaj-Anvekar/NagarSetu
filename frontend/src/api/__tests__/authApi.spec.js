import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import http from '../http'
import { loginAdmin, loginWorker } from '../authApi'

// ---------------------------------------------------------------------------
// Fake adapter
// ---------------------------------------------------------------------------

/**
 * Creates a fake Axios adapter that records the request config and resolves
 * with a successful response containing the given data.
 * Returns { adapter, getLastConfig } so tests can inspect the request.
 */
function makeFakeAdapter(data) {
  let lastConfig = null

  const adapter = async (config) => {
    lastConfig = config
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }

  return {
    adapter,
    getLastConfig: () => lastConfig,
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalAdapter

beforeEach(() => {
  originalAdapter = http.defaults.adapter
  localStorage.clear()
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loginAdmin', () => {
  it('POSTs to /auth/admin/login with { username, password }', async () => {
    const { adapter, getLastConfig } = makeFakeAdapter({
      access_token: 'tok-admin',
      token_type: 'bearer',
    })
    http.defaults.adapter = adapter

    await loginAdmin({ username: 'alice', password: 'secret' })

    const cfg = getLastConfig()
    expect(cfg.url).toBe('/auth/admin/login')
    expect(cfg.method).toBe('post')
    expect(JSON.parse(cfg.data)).toEqual({ username: 'alice', password: 'secret' })
  })

  it('sends skipAuthRedirect: true on the request', async () => {
    const { adapter, getLastConfig } = makeFakeAdapter({
      access_token: 'tok-admin',
      token_type: 'bearer',
    })
    http.defaults.adapter = adapter

    await loginAdmin({ username: 'alice', password: 'secret' })

    expect(getLastConfig().skipAuthRedirect).toBe(true)
  })

  it('returns { token, role: "admin", user } from the response', async () => {
    const fakeUser = { id: 1, name: 'Alice' }
    const { adapter } = makeFakeAdapter({
      access_token: 'tok-admin',
      token_type: 'bearer',
      user: fakeUser,
    })
    http.defaults.adapter = adapter

    const result = await loginAdmin({ username: 'alice', password: 'secret' })

    expect(result).toEqual({ token: 'tok-admin', role: 'admin', user: fakeUser })
  })

  it('sets user to null when the response has no user field', async () => {
    const { adapter } = makeFakeAdapter({ access_token: 'tok-admin', token_type: 'bearer' })
    http.defaults.adapter = adapter

    const result = await loginAdmin({ username: 'alice', password: 'secret' })

    expect(result.user).toBeNull()
  })

  it('throws when the response has no access_token', async () => {
    const { adapter } = makeFakeAdapter({ token_type: 'bearer' })
    http.defaults.adapter = adapter

    await expect(loginAdmin({ username: 'alice', password: 'secret' })).rejects.toThrow(
      'Login response did not include a token',
    )
  })
})

describe('loginWorker', () => {
  it('POSTs to /auth/worker/login with { phone, pin }', async () => {
    const { adapter, getLastConfig } = makeFakeAdapter({
      access_token: 'tok-worker',
      token_type: 'bearer',
    })
    http.defaults.adapter = adapter

    await loginWorker({ phone: '9876543210', pin: '1234' })

    const cfg = getLastConfig()
    expect(cfg.url).toBe('/auth/worker/login')
    expect(cfg.method).toBe('post')
    expect(JSON.parse(cfg.data)).toEqual({ phone: '9876543210', pin: '1234' })
  })

  it('sends skipAuthRedirect: true on the request', async () => {
    const { adapter, getLastConfig } = makeFakeAdapter({
      access_token: 'tok-worker',
      token_type: 'bearer',
    })
    http.defaults.adapter = adapter

    await loginWorker({ phone: '9876543210', pin: '1234' })

    expect(getLastConfig().skipAuthRedirect).toBe(true)
  })

  it('returns { token, role: "worker", user } from the response', async () => {
    const fakeUser = { id: 2, name: 'Bob' }
    const { adapter } = makeFakeAdapter({
      access_token: 'tok-worker',
      token_type: 'bearer',
      user: fakeUser,
    })
    http.defaults.adapter = adapter

    const result = await loginWorker({ phone: '9876543210', pin: '1234' })

    expect(result).toEqual({ token: 'tok-worker', role: 'worker', user: fakeUser })
  })

  it('sets user to null when the response has no user field', async () => {
    const { adapter } = makeFakeAdapter({ access_token: 'tok-worker', token_type: 'bearer' })
    http.defaults.adapter = adapter

    const result = await loginWorker({ phone: '9876543210', pin: '1234' })

    expect(result.user).toBeNull()
  })

  it('throws when the response has no access_token', async () => {
    const { adapter } = makeFakeAdapter({ token_type: 'bearer' })
    http.defaults.adapter = adapter

    await expect(loginWorker({ phone: '9876543210', pin: '1234' })).rejects.toThrow(
      'Login response did not include a token',
    )
  })
})
