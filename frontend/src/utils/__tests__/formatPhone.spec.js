import { describe, expect, it } from 'vitest'
import { formatPhone } from '../formatPhone'

describe('formatPhone utility', () => {
  it('formats valid +91 10-digit numbers into +91 5-digit 5-digit chunks', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210')
  })

  it.each([
    ['+91981110000', '+91981110000'],
    ['9876543210', '9876543210'],
    ['+1 555 0100', '+1 555 0100'],
    ['', ''],
  ])('returns other strings unchanged: %s', (input, expected) => {
    expect(formatPhone(input)).toBe(expected)
  })

  it.each([null, undefined, 42])('returns empty string for non-string inputs: %s', (input) => {
    expect(formatPhone(input)).toBe('')
  })
})

