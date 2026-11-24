/**
 * Safely escapes HTML special characters to prevent XSS when inserting strings into HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Returns a sorted array of hotspots with a 1-based rank assigned to each item.
 * Sorted descending by complaint count, with coordinates as stable tie-breakers.
 *
 * @param {Array<object>} [hotspots=[]]
 * @returns {Array<object & { rank: number }>}
 */
export function rankHotspots(hotspots = []) {
  if (!Array.isArray(hotspots)) {
    return []
  }

  const sorted = [...hotspots].sort((a, b) => {
    const countA = typeof a?.count === 'number' && !Number.isNaN(a.count) ? a.count : 0
    const countB = typeof b?.count === 'number' && !Number.isNaN(b.count) ? b.count : 0
    if (countB !== countA) {
      return countB - countA
    }
    const latA = typeof a?.lat === 'number' ? a.lat : 0
    const latB = typeof b?.lat === 'number' ? b.lat : 0
    if (latA !== latB) {
      return latA - latB
    }
    const lngA = typeof a?.lng === 'number' ? a.lng : 0
    const lngB = typeof b?.lng === 'number' ? b.lng : 0
    return lngA - lngB
  })

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }))
}

/**
 * Formats a rank number into a user-facing label (e.g. 1 -> "#1").
 *
 * @param {number} rank
 * @returns {string}
 */
export function formatHotspotRank(rank) {
  const numeric = typeof rank === 'number' && rank > 0 ? rank : 0
  return numeric > 0 ? `#${numeric}` : ''
}

/**
 * Formats complaint count with singular/plural suffix.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatComplaintCount(count) {
  const numeric = typeof count === 'number' && !Number.isNaN(count) && count >= 0 ? count : 0
  return `${numeric} ${numeric === 1 ? 'complaint' : 'complaints'}`
}

/**
 * Formats the hotspot label safely.
 *
 * @param {object} hotspot
 * @param {number} [rank]
 * @returns {string}
 */
export function formatHotspotLabel(hotspot, rank) {
  if (hotspot?.label && typeof hotspot.label === 'string' && hotspot.label.trim() !== '') {
    return hotspot.label.trim()
  }
  const fallbackRank =
    typeof rank === 'number' && rank > 0
      ? rank
      : typeof hotspot?.rank === 'number' && hotspot.rank > 0
        ? hotspot.rank
        : 1
  return `Hotspot #${fallbackRank}`
}

/**
 * Builds HTML for Leaflet popup card using escaped values.
 * Displays rank, label, count, zone (only if present in data), and category (if present).
 * Never displays citizen personal info or raw coordinates.
 *
 * @param {object} hotspot
 * @param {number} [rank]
 * @returns {string} Sanitized HTML string
 */
export function buildHotspotPopupHtml(hotspot, rank) {
  if (!hotspot || typeof hotspot !== 'object') {
    return ''
  }

  const computedRank =
    typeof rank === 'number' && rank > 0
      ? rank
      : typeof hotspot.rank === 'number' && hotspot.rank > 0
        ? hotspot.rank
        : 1

  const rankStr = formatHotspotRank(computedRank)
  const label = formatHotspotLabel(hotspot, computedRank)
  const countStr = formatComplaintCount(hotspot.count)

  const escapedRank = escapeHtml(rankStr)
  const escapedLabel = escapeHtml(label)
  const escapedCount = escapeHtml(countStr)

  // Show zone only if data provides it
  const zoneVal =
    hotspot.zone && typeof hotspot.zone === 'object'
      ? hotspot.zone.name
      : typeof hotspot.zone === 'string'
        ? hotspot.zone
        : ''
  const trimmedZone = typeof zoneVal === 'string' ? zoneVal.trim() : ''
  const escapedZone = escapeHtml(trimmedZone)

  const categoryVal = typeof hotspot.category === 'string' ? hotspot.category.trim() : ''
  const escapedCategory = escapeHtml(categoryVal)

  let metaBadges = ''
  if (escapedZone) {
    metaBadges += `<span class="ns-hotspot-popup__badge ns-hotspot-popup__badge--zone">${escapedZone}</span>`
  }
  if (escapedCategory) {
    metaBadges += `<span class="ns-hotspot-popup__badge ns-hotspot-popup__badge--cat">${escapedCategory}</span>`
  }

  return `
    <div class="ns-hotspot-popup" role="tooltip">
      <div class="ns-hotspot-popup__header">
        <span class="ns-hotspot-popup__rank">${escapedRank}</span>
        <h4 class="ns-hotspot-popup__title">${escapedLabel}</h4>
      </div>
      <div class="ns-hotspot-popup__count">${escapedCount}</div>
      ${metaBadges ? `<div class="ns-hotspot-popup__badges">${metaBadges}</div>` : ''}
    </div>
  `.trim()
}

/**
 * Finds a hotspot by its ID in a list.
 *
 * @param {Array<object>} hotspots
 * @param {string|number} id
 * @returns {object|undefined}
 */
export function findHotspotById(hotspots, id) {
  if (!Array.isArray(hotspots) || id === undefined || id === null || id === '') {
    return undefined
  }
  const idStr = String(id)
  return hotspots.find((h) => String(h?.id) === idStr)
}
