import { describe, expect, it } from 'vitest'
import { getLoginRoute } from '../loginRoute'

describe('getLoginRoute helper', () => {
  describe('explicit role provided', () => {
    it('returns worker login route with role="worker" query for worker explicit logout', () => {
      const result = getLoginRoute({ role: 'worker' })
      expect(result).toEqual({ path: '/login', query: { role: 'worker' } })
    })

    it('returns exact admin login route { path: "/login" } for admin explicit logout', () => {
      const result = getLoginRoute({ role: 'admin' })
      expect(result).toEqual({ path: '/login' })
    })

    it('returns worker login with reason="expired" on 401 for worker session', () => {
      const result = getLoginRoute({ role: 'worker', reason: 'expired' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', reason: 'expired' },
      })
    })

    it('returns worker login with reason="deactivated" on 401 for worker session', () => {
      const result = getLoginRoute({ role: 'worker', reason: 'deactivated' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', reason: 'deactivated' },
      })
    })

    it('returns exact admin login with reason="expired" on 401 for admin session', () => {
      const result = getLoginRoute({ role: 'admin', reason: 'expired' })
      expect(result).toEqual({
        path: '/login',
        query: { reason: 'expired' },
      })
    })

    it('returns exact admin login with reason="deactivated" on 401 for admin session', () => {
      const result = getLoginRoute({ role: 'admin', reason: 'deactivated' })
      expect(result).toEqual({
        path: '/login',
        query: { reason: 'deactivated' },
      })
    })

    it('preserves redirect query parameter for worker', () => {
      const result = getLoginRoute({ role: 'worker', redirect: '/worker/tasks/t1' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', redirect: '/worker/tasks/t1' },
      })
    })

    it('preserves redirect query parameter for admin', () => {
      const result = getLoginRoute({ role: 'admin', redirect: '/admin/complaints' })
      expect(result).toEqual({
        path: '/login',
        query: { redirect: '/admin/complaints' },
      })
    })
  })

  describe('undetermined role (fallback based on area or default)', () => {
    it('falls back to admin login when current path starts with /admin', () => {
      const result = getLoginRoute({ currentPath: '/admin/workers' })
      expect(result).toEqual({ path: '/login' })
    })

    it('falls back to admin login with reason="expired" when in /admin area on 401', () => {
      const result = getLoginRoute({ currentPath: '/admin/complaints', reason: 'expired' })
      expect(result).toEqual({
        path: '/login',
        query: { reason: 'expired' },
      })
    })

    it('falls back to admin login with reason="deactivated" when in /admin area on 401', () => {
      const result = getLoginRoute({ currentPath: '/admin/complaints', reason: 'deactivated' })
      expect(result).toEqual({
        path: '/login',
        query: { reason: 'deactivated' },
      })
    })

    it('falls back to worker login when current path starts with /worker', () => {
      const result = getLoginRoute({ currentPath: '/worker/account' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker' },
      })
    })

    it('falls back to worker login with reason="expired" when in /worker area on 401', () => {
      const result = getLoginRoute({ currentPath: '/worker/tasks/1', reason: 'expired' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', reason: 'expired' },
      })
    })

    it('falls back to worker login with reason="deactivated" when in /worker area on 401', () => {
      const result = getLoginRoute({ currentPath: '/worker/tasks/1', reason: 'deactivated' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', reason: 'deactivated' },
      })
    })

    it('falls back to worker login when role is null and area is unknown', () => {
      const result = getLoginRoute({ role: null, currentPath: '/' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker' },
      })
    })

    it('falls back to worker login when called with no arguments', () => {
      const result = getLoginRoute()
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker' },
      })
    })
  })

  describe('argument flexibility', () => {
    it('accepts (role, options) positional arguments', () => {
      const result = getLoginRoute('worker', { reason: 'expired' })
      expect(result).toEqual({
        path: '/login',
        query: { role: 'worker', reason: 'expired' },
      })
    })

    it('accepts currentPath as a route object with a path property', () => {
      const result = getLoginRoute({ currentPath: { path: '/admin/hotspots' } })
      expect(result).toEqual({ path: '/login' })
    })
  })
})
