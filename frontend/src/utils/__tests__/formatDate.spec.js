import { describe, expect, it } from 'vitest'
import { formatDateTime, getDueInfo } from '../formatDate'

describe('formatDate utility', () => {
  const fixedNow = new Date('2026-10-25T12:00:00.000Z').getTime()

  describe('getDueInfo', () => {
    it('returns 5 h left for deadline 5 hours ahead', () => {
      const deadline = new Date(fixedNow + 5 * 60 * 60 * 1000).toISOString()
      expect(getDueInfo(deadline, fixedNow)).toEqual({ text: '5 h left', overdue: false })
    })

    it('returns 3 h overdue with overdue true for deadline 3 hours behind', () => {
      const deadline = new Date(fixedNow - 3 * 60 * 60 * 1000).toISOString()
      expect(getDueInfo(deadline, fixedNow)).toEqual({ text: '3 h overdue', overdue: true })
    })

    it('returns 30 min left for deadline 30 minutes ahead', () => {
      const deadline = new Date(fixedNow + 30 * 60 * 1000).toISOString()
      expect(getDueInfo(deadline, fixedNow)).toEqual({ text: '30 min left', overdue: false })
    })

    it('returns 10 min overdue with overdue true for deadline 10 minutes behind', () => {
      const deadline = new Date(fixedNow - 10 * 60 * 1000).toISOString()
      expect(getDueInfo(deadline, fixedNow)).toEqual({ text: '10 min overdue', overdue: true })
    })

    it('returns 3 d left for deadline 3 days ahead', () => {
      const deadline = new Date(fixedNow + 3 * 24 * 60 * 60 * 1000).toISOString()
      expect(getDueInfo(deadline, fixedNow)).toEqual({ text: '3 d left', overdue: false })
    })

    it.each([null, '', 'nonsense'])('returns No deadline for invalid or missing value %s', (val) => {
      expect(getDueInfo(val, fixedNow)).toEqual({ text: 'No deadline', overdue: false })
    })
  })

  describe('formatDateTime', () => {
    it.each([null, undefined, 42, 'nonsense'])('returns em dash for invalid input %s', (val) => {
      expect(formatDateTime(val)).toBe('—')
    })

    it('returns a formatted non-empty string for valid ISO input without Invalid text', () => {
      const formatted = formatDateTime('2026-10-25T15:30:00.000Z')
      expect(formatted).not.toBe('—')
      expect(formatted).not.toContain('Invalid')
      expect(formatted.length).toBeGreaterThan(0)
    })
  })
})

