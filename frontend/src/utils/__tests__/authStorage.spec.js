import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuth, getLastRole, getToken, loadAuth, saveAuth, saveLastRole } from '../authStorage'

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

  describe('saveLastRole and getLastRole', () => {
    it('saves worker role and retrieves it', () => {
      saveLastRole('worker')
      expect(getLastRole()).toBe('worker')
      expect(localStorage.getItem('ns_last_role')).toBe('worker')
    })

    it('saves admin role and retrieves it', () => {
      saveLastRole('admin')
      expect(getLastRole()).toBe('admin')
      expect(localStorage.getItem('ns_last_role')).toBe('admin')
    })

    it('ignores invalid roles when saving', () => {
      saveLastRole('superuser')
      expect(getLastRole()).toBeNull()
      expect(localStorage.getItem('ns_last_role')).toBeNull()

      saveLastRole('worker')
      expect(getLastRole()).toBe('worker')

      saveLastRole('guest')
      expect(getLastRole()).toBe('worker')
    })

    it('returns null if stored value in localStorage is corrupted or not a valid role', () => {
      localStorage.setItem('ns_last_role', 'random-value')
      expect(getLastRole()).toBeNull()
    })

    it('does not remove last role on clearAuth', () => {
      saveAuth({ token: 'tok', role: 'worker', user: null })
      saveLastRole('worker')

      clearAuth()

      expect(loadAuth()).toBeNull()
      expect(getLastRole()).toBe('worker')
    })

    it('handles localStorage errors gracefully without throwing', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      expect(() => saveLastRole('worker')).not.toThrow()
      setItemSpy.mockRestore()

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('AccessDenied')
      })
      expect(() => getLastRole()).not.toThrow()
      expect(getLastRole()).toBeNull()
      getItemSpy.mockRestore()
    })
  })
})
