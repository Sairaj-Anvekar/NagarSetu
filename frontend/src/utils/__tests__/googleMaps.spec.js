import { describe, expect, it } from 'vitest'
import { buildDirectionsUrl } from '../googleMaps'

describe('buildDirectionsUrl', () => {
  it('returns the Google Maps directions URL for valid coordinates', () => {
    expect(buildDirectionsUrl(17.68, 75.88)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=17.68%2C75.88',
    )
  })

  it.each([
    [undefined, 75.88],
    [17.68, undefined],
    [null, 75.88],
    [17.68, null],
    [Number.NaN, 75.88],
    [17.68, Number.NaN],
    [Number.POSITIVE_INFINITY, 75.88],
    ['17.68', 75.88],
  ])('returns null for invalid coordinates (%s, %s)', (lat, lng) => {
    expect(buildDirectionsUrl(lat, lng)).toBeNull()
  })
})

