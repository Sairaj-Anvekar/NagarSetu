/**
 * Build a Google Maps directions URL for a complaint's coordinates.
 * Returns null when either coordinate is missing or not a finite number.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string|null}
 */
export function buildDirectionsUrl(latitude, longitude) {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude)
  ) {
    return null
  }

  const destination = encodeURIComponent(`${latitude},${longitude}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

