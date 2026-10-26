import { describe, it, expect } from 'vitest'
import { makeMockToken, readMockSession, normalizePhone } from '../mockAuth'

describe('mockAuth helpers', () => {
  describe('makeMockToken', () => {
    it('returns a formatted mock token string', () => {
      expect(makeMockToken('admin', '1')).toBe('mock-token-admin-1')
      expect(makeMockToken('worker', '101')).toBe('mock-token-worker-101')
    })
  })

  describe('readMockSession', () => {
    it('returns role and id for a valid Bearer token from headers', () => {
      const mockAxiosHeaders = {
        get: (h) => (h.toLowerCase() === 'authorization' ? 'Bearer mock-token-admin-1' : null)
      }
      expect(readMockSession(mockAxiosHeaders)).toEqual({ role: 'admin', id: '1' })

      const plainHeaders = { Authorization: 'Bearer mock-token-worker-101' }
      expect(readMockSession(plainHeaders)).toEqual({ role: 'worker', id: '101' })
    })

    it('returns null for missing, wrong scheme or malformed values', () => {
      expect(readMockSession(null)).toBeNull()
      expect(readMockSession({})).toBeNull()
      expect(readMockSession({ Authorization: 'Basic mock-token-admin-1' })).toBeNull()
      expect(readMockSession({ Authorization: 'Bearer invalid-token' })).toBeNull()
      expect(readMockSession({ Authorization: 'Bearer mock-token-onlyrole' })).toBeNull()
    })
  })

  describe('normalizePhone', () => {
    it('normalizes 10-digit phone numbers with or without spaces to +91 format', () => {
      expect(normalizePhone('98765 43210')).toBe('+919876543210')
      expect(normalizePhone('9876543210')).toBe('+919876543210')
    })

    it('leaves numbers starting with + and short/odd numbers unchanged', () => {
      expect(normalizePhone('+919876543210')).toBe('+919876543210')
      expect(normalizePhone('12345')).toBe('12345')
      expect(normalizePhone('abc')).toBe('abc')
    })
  })
})
