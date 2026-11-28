import { describe, expect, it } from 'vitest'
import { labelOf } from './labelOf'

describe('labelOf', () => {
  it('returns trimmed string when passed a valid string', () => {
    expect(labelOf('Zone A')).toBe('Zone A')
    expect(labelOf('  Sanitation  ')).toBe('Sanitation')
  })

  it('returns trimmed name when passed an object with a non-empty name string', () => {
    expect(labelOf({ id: '1', name: 'Zone A' })).toBe('Zone A')
    expect(labelOf({ name: '  Sanitation  ' })).toBe('Sanitation')
    expect(labelOf({ id: 42, name: 'Electrical', code: 'E1' })).toBe('Electrical')
  })

  it('returns fallback for empty string or whitespace-only string', () => {
    expect(labelOf('')).toBe('')
    expect(labelOf('   ')).toBe('')
    expect(labelOf('', '—')).toBe('—')
    expect(labelOf('   ', 'N/A')).toBe('N/A')
  })

  it('returns fallback for null and undefined', () => {
    expect(labelOf(null)).toBe('')
    expect(labelOf(undefined)).toBe('')
    expect(labelOf(null, '—')).toBe('—')
    expect(labelOf(undefined, 'Fallback')).toBe('Fallback')
  })

  it('returns fallback for objects without a valid name property', () => {
    expect(labelOf({})).toBe('')
    expect(labelOf({ id: '1' })).toBe('')
    expect(labelOf({ id: '1', name: '' })).toBe('')
    expect(labelOf({ id: '1', name: '   ' })).toBe('')
    expect(labelOf({ name: null })).toBe('')
    expect(labelOf({ name: 123 })).toBe('')
    expect(labelOf({}, 'Unassigned')).toBe('Unassigned')
  })

  it('returns fallback for numbers and other non-string/non-object primitives', () => {
    expect(labelOf(0)).toBe('')
    expect(labelOf(123)).toBe('')
    expect(labelOf(true)).toBe('')
    expect(labelOf(false)).toBe('')
    expect(labelOf([1, 2, 3])).toBe('')
    expect(labelOf(123, '—')).toBe('—')
  })

  it('uses default fallback of empty string when fallback argument is omitted', () => {
    expect(labelOf(null)).toBe('')
    expect(labelOf({})).toBe('')
  })

  it('respects custom fallback argument across all invalid shapes', () => {
    const fallback = 'Department unavailable'
    expect(labelOf(null, fallback)).toBe(fallback)
    expect(labelOf(undefined, fallback)).toBe(fallback)
    expect(labelOf('', fallback)).toBe(fallback)
    expect(labelOf({ id: '3' }, fallback)).toBe(fallback)
  })

  it('never returns an object or "[object Object]"', () => {
    const rawObj = { id: '1', name: 'Zone A' }
    const res1 = labelOf(rawObj)
    expect(typeof res1).toBe('string')
    expect(res1).not.toBe('[object Object]')
    expect(res1).not.toContain('{')

    const emptyObj = {}
    const res2 = labelOf(emptyObj)
    expect(typeof res2).toBe('string')
    expect(res2).not.toBe('[object Object]')
  })
})
