import { describe, expect, it } from 'vitest'
import { getInitialLoginRole } from '../initialLoginRole'

describe('getInitialLoginRole helper', () => {
  describe('priority (a): route.query.role is worker or admin', () => {
    it('returns worker when query role is worker, even if remembered role is admin and standalone is false', () => {
      const role = getInitialLoginRole('worker', null, 'admin', false)
      expect(role).toBe('worker')
    })

    it('returns admin when query role is admin, even if remembered role is worker and standalone is true', () => {
      const role = getInitialLoginRole('admin', null, 'worker', true)
      expect(role).toBe('admin')
    })

    it('query role beats redirect path when both are present', () => {
      expect(
        getInitialLoginRole({
          queryRole: 'worker',
          redirectPath: '/admin/complaints',
          rememberedRole: 'admin',
          isStandalone: false,
        }),
      ).toBe('worker')

      expect(
        getInitialLoginRole({
          queryRole: 'admin',
          redirectPath: '/worker/account',
          rememberedRole: 'worker',
          isStandalone: true,
        }),
      ).toBe('admin')
    })

    it('works when passed an options object', () => {
      const role = getInitialLoginRole({
        queryRole: 'worker',
        rememberedRole: 'admin',
        isStandalone: false,
      })
      expect(role).toBe('worker')
    })
  })

  describe('priority (b): role implied by redirect path', () => {
    it('redirect /admin/complaints with remembered worker -> admin', () => {
      const role = getInitialLoginRole({
        queryRole: null,
        redirectPath: '/admin/complaints',
        rememberedRole: 'worker',
        isStandalone: false,
      })
      expect(role).toBe('admin')
    })

    it('redirect exact /admin with remembered worker -> admin', () => {
      const role = getInitialLoginRole(null, '/admin', 'worker', false)
      expect(role).toBe('admin')
    })

    it('redirect /worker/account with remembered admin -> worker', () => {
      const role = getInitialLoginRole({
        queryRole: null,
        redirectPath: '/worker/account',
        rememberedRole: 'admin',
        isStandalone: false,
      })
      expect(role).toBe('worker')
    })

    it('redirect exact /worker with remembered admin -> worker', () => {
      const role = getInitialLoginRole(null, '/worker', 'admin', false)
      expect(role).toBe('worker')
    })

    it('ignores invalid redirect values and falls back to remembered role or next priority', () => {
      // external URL
      expect(
        getInitialLoginRole({
          queryRole: null,
          redirectPath: 'https://x.com',
          rememberedRole: 'worker',
        }),
      ).toBe('worker')

      // empty string
      expect(
        getInitialLoginRole({
          queryRole: null,
          redirectPath: '',
          rememberedRole: 'worker',
        }),
      ).toBe('worker')

      // array value
      expect(
        getInitialLoginRole({
          queryRole: null,
          redirectPath: ['/admin/complaints'],
          rememberedRole: 'worker',
        }),
      ).toBe('worker')

      // path not starting with /admin or /worker
      expect(
        getInitialLoginRole({
          queryRole: null,
          redirectPath: '/design',
          rememberedRole: 'worker',
        }),
      ).toBe('worker')

      // invalid redirect with no remembered role defaults to admin
      expect(
        getInitialLoginRole({
          queryRole: null,
          redirectPath: 'https://malicious.org',
          rememberedRole: null,
        }),
      ).toBe('admin')
    })
  })

  describe('priority (c): remembered role from localStorage', () => {
    it('returns remembered worker when query role and redirect are missing', () => {
      expect(getInitialLoginRole(null, null, 'worker', false)).toBe('worker')
      expect(getInitialLoginRole(undefined, undefined, 'worker', false)).toBe('worker')
    })

    it('returns remembered admin when query role and redirect are missing', () => {
      expect(getInitialLoginRole(null, null, 'admin', true)).toBe('admin')
      expect(getInitialLoginRole(undefined, undefined, 'admin', true)).toBe('admin')
    })

    it('returns remembered role when query role and redirect are invalid', () => {
      expect(getInitialLoginRole('guest', 'https://x.com', 'worker', false)).toBe('worker')
      expect(getInitialLoginRole('invalid', '', 'admin', false)).toBe('admin')
    })
  })

  describe('priority (d): installed standalone PWA', () => {
    it('returns worker when standalone is true and query/redirect/remembered roles are missing', () => {
      expect(getInitialLoginRole(null, null, null, true)).toBe('worker')
      expect(getInitialLoginRole(undefined, undefined, undefined, true)).toBe('worker')
    })

    it('returns worker when standalone is true and query/redirect/remembered roles are invalid', () => {
      expect(getInitialLoginRole('invalid', 'not-a-path', 'unknown', true)).toBe('worker')
    })
  })

  describe('priority (e): default fallback to admin', () => {
    it('returns admin when no arguments are passed', () => {
      expect(getInitialLoginRole()).toBe('admin')
    })

    it('returns admin when all inputs are null or undefined and standalone is false', () => {
      expect(getInitialLoginRole(null, null, null, false)).toBe('admin')
      expect(getInitialLoginRole(undefined, undefined, undefined, false)).toBe('admin')
    })

    it('returns admin when roles and redirect are invalid and standalone is false', () => {
      expect(getInitialLoginRole('moderator', '/unknown', 'superuser', false)).toBe('admin')
      expect(getInitialLoginRole('', '', '', false)).toBe('admin')
    })

    it('handles unexpected types safely', () => {
      expect(getInitialLoginRole(123, 456, {}, false)).toBe('admin')
      expect(getInitialLoginRole(['worker'], true, true, false)).toBe('admin')
    })
  })
})
