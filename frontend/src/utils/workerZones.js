/**
 * Zone coverage and gap alert utilities for the Admin Workers view.
 */

export const DEFAULT_ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D']

/**
 * Normalizes a zone parameter to a clean string name.
 *
 * @param {string|{ name?: string, id?: string }} zone
 * @returns {string}
 */
export function normalizeZoneName(zone) {
  if (typeof zone === 'string') {
    return zone.trim()
  }
  if (zone && typeof zone === 'object' && typeof zone.name === 'string') {
    return zone.name.trim()
  }
  return ''
}

/**
 * Computes active worker counts and total worker counts for each zone
 * in the provided fixed zones list.
 *
 * @param {Array<object>} workers
 * @param {Array<string|object>} [zones=DEFAULT_ZONES]
 * @returns {Array<{ zone: string, activeWorkers: number, totalWorkers: number, hasActiveWorker: boolean }>}
 */
export function computeZoneCoverage(workers = [], zones = DEFAULT_ZONES) {
  const safeWorkers = Array.isArray(workers) ? workers : []
  const safeZones = Array.isArray(zones) && zones.length > 0 ? zones : DEFAULT_ZONES

  return safeZones.map((z) => {
    const zoneName = normalizeZoneName(z)

    let activeWorkers = 0
    let totalWorkers = 0

    for (const w of safeWorkers) {
      const workerZone = normalizeZoneName(w?.zone)
      if (workerZone && workerZone.toLowerCase() === zoneName.toLowerCase()) {
        totalWorkers++
        if (w?.is_active) {
          activeWorkers++
        }
      }
    }

    return {
      zone: zoneName,
      activeWorkers,
      totalWorkers,
      hasActiveWorker: activeWorkers > 0,
    }
  })
}

/**
 * Identifies zones that have complaints waiting but no active Sanitation worker.
 *
 * @param {Array<object>} workers
 * @param {Array<{ zone: string, count: number }>} [zoneStats=[]]
 * @param {Array<string|object>} [zones=DEFAULT_ZONES]
 * @returns {Array<{ zone: string, complaintCount: number, message: string }>}
 */
export function findZoneGaps(workers = [], zoneStats = [], zones = DEFAULT_ZONES) {
  if (!Array.isArray(zoneStats) || zoneStats.length === 0) {
    return []
  }

  const coverage = computeZoneCoverage(workers, zones)
  const gaps = []

  for (const item of coverage) {
    if (!item.hasActiveWorker) {
      const statMatch = zoneStats.find(
        (s) => normalizeZoneName(s?.zone).toLowerCase() === item.zone.toLowerCase(),
      )
      const complaintCount =
        statMatch && typeof statMatch.count === 'number' && !Number.isNaN(statMatch.count)
          ? statMatch.count
          : 0

      if (complaintCount > 0) {
        const noun = complaintCount === 1 ? 'complaint' : 'complaints'
        gaps.push({
          zone: item.zone,
          complaintCount,
          message: `${item.zone} has no active Sanitation worker. ${complaintCount} ${noun} in this zone.`,
        })
      }
    }
  }

  return gaps
}

/**
 * Returns the primary (first) zone gap alert message, or null if no gap exists.
 *
 * @param {Array<object>} workers
 * @param {Array<{ zone: string, count: number }>} [zoneStats=[]]
 * @param {Array<string|object>} [zones=DEFAULT_ZONES]
 * @returns {{ zone: string, complaintCount: number, message: string }|null}
 */
export function getPrimaryZoneGap(workers = [], zoneStats = [], zones = DEFAULT_ZONES) {
  const gaps = findZoneGaps(workers, zoneStats, zones)
  return gaps.length > 0 ? gaps[0] : null
}
