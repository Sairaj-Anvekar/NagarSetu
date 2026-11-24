import { describe, expect, it } from 'vitest'
import {
  computeZoneCoverage,
  DEFAULT_ZONES,
  findZoneGaps,
  getPrimaryZoneGap,
  normalizeZoneName,
} from '../workerZones'

describe('workerZones util', () => {
  const sampleWorkers = [
    { id: '101', name: 'Ravi Patil', zone: 'Zone A', is_active: true },
    { id: '102', name: 'Anita Sharma', zone: 'Zone B', is_active: true },
    { id: '103', name: 'Kiran Jadhav', zone: 'Zone A', is_active: false },
    { id: '104', name: 'Sunita Pawar', zone: 'Zone B', is_active: false },
    { id: '106', name: 'Meera Joshi', zone: 'Zone C', is_active: true },
    { id: '108', name: 'Suresh Nair', zone: 'Zone D', is_active: false },
  ]

  describe('normalizeZoneName', () => {
    it('normalizes string zone', () => {
      expect(normalizeZoneName('  Zone A  ')).toBe('Zone A')
    })

    it('normalizes object zone with name property', () => {
      expect(normalizeZoneName({ id: 'z1', name: 'Zone B' })).toBe('Zone B')
    })

    it('returns empty string for null, undefined, or invalid input', () => {
      expect(normalizeZoneName(null)).toBe('')
      expect(normalizeZoneName(undefined)).toBe('')
      expect(normalizeZoneName(123)).toBe('')
    })
  })

  describe('computeZoneCoverage', () => {
    it('uses DEFAULT_ZONES (A, B, C, D) by default', () => {
      const coverage = computeZoneCoverage([])
      expect(coverage).toHaveLength(4)
      expect(coverage.map((c) => c.zone)).toEqual(DEFAULT_ZONES)
      expect(coverage.every((c) => c.activeWorkers === 0 && !c.hasActiveWorker)).toBe(true)
    })

    it('counts active and total workers accurately per zone', () => {
      const coverage = computeZoneCoverage(sampleWorkers)

      expect(coverage).toEqual([
        { zone: 'Zone A', activeWorkers: 1, totalWorkers: 2, hasActiveWorker: true },
        { zone: 'Zone B', activeWorkers: 1, totalWorkers: 2, hasActiveWorker: true },
        { zone: 'Zone C', activeWorkers: 1, totalWorkers: 1, hasActiveWorker: true },
        { zone: 'Zone D', activeWorkers: 0, totalWorkers: 1, hasActiveWorker: false },
      ])
    })

    it('displays Zone D with activeWorkers 0 and hasActiveWorker false even if it has no workers at all', () => {
      const workersWithoutZoneD = sampleWorkers.filter((w) => w.zone !== 'Zone D')
      const coverage = computeZoneCoverage(workersWithoutZoneD)

      const zoneD = coverage.find((c) => c.zone === 'Zone D')
      expect(zoneD).toEqual({
        zone: 'Zone D',
        activeWorkers: 0,
        totalWorkers: 0,
        hasActiveWorker: false,
      })
    })

    it('handles worker zone objects with name property', () => {
      const workersWithObj = [
        { id: '201', name: 'Test', zone: { id: 'z1', name: 'Zone A' }, is_active: true },
      ]
      const coverage = computeZoneCoverage(workersWithObj)
      expect(coverage[0]).toEqual({
        zone: 'Zone A',
        activeWorkers: 1,
        totalWorkers: 1,
        hasActiveWorker: true,
      })
    })

    it('safely handles non-array workers input', () => {
      expect(computeZoneCoverage(null)).toHaveLength(4)
      expect(computeZoneCoverage(undefined)).toHaveLength(4)
    })
  })

  describe('findZoneGaps and getPrimaryZoneGap', () => {
    const zoneStats = [
      { zone: 'Zone A', count: 10 },
      { zone: 'Zone B', count: 5 },
      { zone: 'Zone C', count: 2 },
      { zone: 'Zone D', count: 3 },
    ]

    it('identifies Zone D as having a gap when it has 0 active workers and 3 complaints', () => {
      const gaps = findZoneGaps(sampleWorkers, zoneStats)
      expect(gaps).toHaveLength(1)
      expect(gaps[0]).toEqual({
        zone: 'Zone D',
        complaintCount: 3,
        message: 'Zone D has no active Sanitation worker. 3 complaints in this zone.',
      })
    })

    it('pluralizes correctly for 1 complaint', () => {
      const singleComplaintStats = [{ zone: 'Zone D', count: 1 }]
      const gaps = findZoneGaps(sampleWorkers, singleComplaintStats)
      expect(gaps[0].message).toBe(
        'Zone D has no active Sanitation worker. 1 complaint in this zone.',
      )
    })

    it('returns empty array when zone has 0 active workers but 0 complaints', () => {
      const zeroComplaintStats = [{ zone: 'Zone D', count: 0 }]
      const gaps = findZoneGaps(sampleWorkers, zeroComplaintStats)
      expect(gaps).toEqual([])
    })

    it('returns empty array when all zones have active workers', () => {
      const allActiveWorkers = [
        ...sampleWorkers,
        { id: '109', name: 'Zone D Worker', zone: 'Zone D', is_active: true },
      ]
      const gaps = findZoneGaps(allActiveWorkers, zoneStats)
      expect(gaps).toEqual([])
    })

    it('returns empty array when zoneStats is empty or missing (e.g. fetchStats failed)', () => {
      expect(findZoneGaps(sampleWorkers, [])).toEqual([])
      expect(findZoneGaps(sampleWorkers, null)).toEqual([])
      expect(findZoneGaps(sampleWorkers, undefined)).toEqual([])
    })

    it('getPrimaryZoneGap returns first gap or null', () => {
      expect(getPrimaryZoneGap(sampleWorkers, zoneStats)).toEqual({
        zone: 'Zone D',
        complaintCount: 3,
        message: 'Zone D has no active Sanitation worker. 3 complaints in this zone.',
      })

      expect(getPrimaryZoneGap(sampleWorkers, [])).toBeNull()
    })
  })
})
