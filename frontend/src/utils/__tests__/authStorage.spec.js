import { beforeEach, describe, expect, it } from 'vitest'
import { clearAuth, getToken, loadAuth, saveAuth } from '../authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saveAuth then loadAuth round-trips the stored object', () => {
    saveAuth({ token: 'tok123', role: 'admin', user: { id: 1 } })
    expect(loadAuth()).toEqual({ token: 'tok123', role: 'admin', user: { id: 1 } })
  })

  it('loadAuth returns null when localStorage is empty', () => {
    expect(loadAuth()).toBeNull()
  })

  it('loadAuth returns null when stored text is not valid JSON', () => {
    localStorage.setItem('nagarsetu_auth', 'not-valid-json{{{')
    expect(loadAuth()).toBeNull()
  })

  it('loadAuth returns null when the stored object has no token', () => {
    localStorage.setItem('nagarsetu_auth', JSON.stringify({ role: 'admin', user: { id: 1 } }))
    expect(loadAuth()).toBeNull()
  })

  it('getToken returns the token string when auth is stored', () => {
    saveAuth({ token: 'mytoken', role: 'worker', user: { id: 2 } })
    expect(getToken()).toBe('mytoken')
  })

  it('getToken returns null when nothing is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('clearAuth removes the stored auth data', () => {
    saveAuth({ token: 'tok123', role: 'admin', user: { id: 1 } })
    clearAuth()
    expect(loadAuth()).toBeNull()
  })

  it('getToken reflects changes made after the first call (no in-memory caching)', () => {
    saveAuth({ token: 'first', role: 'admin', user: { id: 1 } })
    expect(getToken()).toBe('first')

    // Replace with a different token directly in localStorage
    localStorage.setItem('nagarsetu_auth', JSON.stringify({ token: 'second', role: 'admin', user: { id: 1 } }))
    expect(getToken()).toBe('second')

    // Clear and confirm null is returned immediately
    clearAuth()
    expect(getToken()).toBeNull()
  })
})
