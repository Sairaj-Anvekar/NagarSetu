import { describe, expect, it } from 'vitest'
import { getInitials } from '../initials'

describe('getInitials', () => {
  it.each([
    ['Demo Admin', 'DA'],
    ['ravi', 'R'],
    ['Ravi Kumar Patil', 'RP'],
    ['  Demo   Admin  ', 'DA'],
    ['  ravi  ', 'R'],
  ])('returns %s initials as %s', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })

  it.each(['', '   ', null, undefined, 123])(
    'returns an empty string without throwing for %s',
    (name) => {
      expect(() => getInitials(name)).not.toThrow()
      expect(getInitials(name)).toBe('')
    },
  )
})
