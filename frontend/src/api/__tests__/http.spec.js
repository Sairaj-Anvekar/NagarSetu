import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import http, { setUnauthorizedHandler } from '../http'
import { saveAuth } from '../../utils/authStorage'

// ---------------------------------------------------------------------------
// Fake adapter helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fake adapter that resolves with a successful 200 response.
 * The `config` passed in by Axios is echoed back so tests can inspect
 * the headers that were set by the request interceptor.
 */
function makeSuccessAdapter(data = { ok: true }) {
  return async (config) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
}

/**
 * Returns a fake adapter that rejects with an AxiosError for the given
 * HTTP status code.  The config is attached so the response interceptor
 * can read `config.skipAuthRedirect`.
 */
function makeErrorAdapter(status, data = {}) {
  return async (config) => {
    const response = { status, data, headers: {}, config }
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response)
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalAdapter

beforeEach(() => {
  // Capture the real adapter so we can restore it after each test
  originalAdapter = http.defaults.adapter
  localStorage.clear()
  setUnauthorizedHandler(null)
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  setUnauthorizedHandler(null)
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('http — request interceptor', () => {
  it('sets Authorization header when a token is stored', async () => {
    saveAuth({ token: 'test-token-abc', role: 'admin', user: { id: 1 } })

    let capturedConfig = null
    http.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await http.get('/test')
    expect(capturedConfig.headers['Authorization']).toBe('Bearer test-token-abc')
  })

  it('does NOT set Authorization header when no token is stored', async () => {
    let capturedConfig = null
    http.defaults.adapter = async (config) => {
      capturedConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await http.get('/test')
    expect(capturedConfig.headers['Authorization']).toBeUndefined()
  })
})

describe('http — response interceptor (errors)', () => {
  it('calls the registered handler once on a 401 response', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = makeErrorAdapter(401)

    await expect(http.get('/test')).rejects.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does NOT call the handler when skipAuthRedirect is true on a 401', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = makeErrorAdapter(401)

    await expect(http.get('/test', { skipAuthRedirect: true })).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('does NOT call the handler on a 403 response', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = makeErrorAdapter(403)

    await expect(http.get('/test')).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('still rejects (caller catch runs) after a 401 that triggers the handler', async () => {
    setUnauthorizedHandler(vi.fn())
    http.defaults.adapter = makeErrorAdapter(401)

    await expect(http.get('/test')).rejects.toBeInstanceOf(AxiosError)
  })

  it('still rejects (caller catch runs) after a 401 with skipAuthRedirect', async () => {
    http.defaults.adapter = makeErrorAdapter(401)

    await expect(http.get('/test', { skipAuthRedirect: true })).rejects.toBeInstanceOf(AxiosError)
  })

  it('still rejects (caller catch runs) after a 403', async () => {
    http.defaults.adapter = makeErrorAdapter(403)

    await expect(http.get('/test')).rejects.toBeInstanceOf(AxiosError)
  })

  it('does NOT call the handler when no handler is registered (401)', async () => {
    // No setUnauthorizedHandler call — handler stays null
    http.defaults.adapter = makeErrorAdapter(401)

    // Should reject but must not throw a TypeError from calling null
    await expect(http.get('/test')).rejects.toBeInstanceOf(AxiosError)
  })
})

describe('http — successful response', () => {
  it('passes a 200 response through unchanged and does not call the handler', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    http.defaults.adapter = makeSuccessAdapter({ message: 'hello' })

    const response = await http.get('/test')
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ message: 'hello' })
    expect(handler).not.toHaveBeenCalled()
  })
})
