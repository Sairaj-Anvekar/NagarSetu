import { describe, expect, it } from 'vitest'
import {
  buildHotspotPopupHtml,
  escapeHtml,
  findHotspotById,
  formatComplaintCount,
  formatHotspotLabel,
  formatHotspotRank,
  rankHotspots,
} from '../hotspotRanking'

describe('hotspotRanking utility', () => {
  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
      expect(escapeHtml('Tom & Jerry\'s "Cheese"')).toBe(
        'Tom &amp; Jerry&#39;s &quot;Cheese&quot;'
      )
    })

    it('returns empty string for null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    it('handles non-string primitives', () => {
      expect(escapeHtml(123)).toBe('123')
      expect(escapeHtml(0)).toBe('0')
      expect(escapeHtml(false)).toBe('false')
    })
  })

  describe('rankHotspots', () => {
    it('returns an empty array when given empty or non-array input', () => {
      expect(rankHotspots([])).toEqual([])
      expect(rankHotspots(null)).toEqual([])
      expect(rankHotspots(undefined)).toEqual([])
    })

    it('sorts hotspots descending by complaint count and assigns 1-based ranks', () => {
      const input = [
        { id: 'h1', count: 3, label: 'Area C' },
        { id: 'h2', count: 18, label: 'Area A' },
        { id: 'h3', count: 9, label: 'Area B' },
      ]

      const ranked = rankHotspots(input)

      expect(ranked).toHaveLength(3)
      expect(ranked[0].id).toBe('h2')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].id).toBe('h3')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[2].id).toBe('h1')
      expect(ranked[2].rank).toBe(3)
    })

    it('breaks ties using latitude and longitude', () => {
      const input = [
        { id: 'h1', count: 10, lat: 17.68, lng: 75.89 },
        { id: 'h2', count: 10, lat: 17.67, lng: 75.88 },
        { id: 'h3', count: 10, lat: 17.67, lng: 75.87 },
      ]

      const ranked = rankHotspots(input)

      expect(ranked[0].id).toBe('h3')
      expect(ranked[1].id).toBe('h2')
      expect(ranked[2].id).toBe('h1')
    })

    it('preserves all properties of the original hotspot objects', () => {
      const input = [
        {
          id: 'h1',
          lat: 17.68,
          lng: 75.88,
          count: 5,
          label: 'Market Center',
          category: 'Garbage Dump',
          zone: 'Zone A',
        },
      ]

      const ranked = rankHotspots(input)
      expect(ranked[0]).toEqual({
        id: 'h1',
        lat: 17.68,
        lng: 75.88,
        count: 5,
        label: 'Market Center',
        category: 'Garbage Dump',
        zone: 'Zone A',
        rank: 1,
      })
    })
  })

  describe('formatHotspotRank', () => {
    it('formats valid ranks with a hash prefix', () => {
      expect(formatHotspotRank(1)).toBe('#1')
      expect(formatHotspotRank(10)).toBe('#10')
    })

    it('returns empty string for invalid ranks', () => {
      expect(formatHotspotRank(0)).toBe('')
      expect(formatHotspotRank(-1)).toBe('')
      expect(formatHotspotRank(null)).toBe('')
    })
  })

  describe('formatComplaintCount', () => {
    it('pluralizes correctly', () => {
      expect(formatComplaintCount(1)).toBe('1 complaint')
      expect(formatComplaintCount(2)).toBe('2 complaints')
      expect(formatComplaintCount(0)).toBe('0 complaints')
      expect(formatComplaintCount(null)).toBe('0 complaints')
    })
  })

  describe('formatHotspotLabel', () => {
    it('uses label when available and trimmed', () => {
      expect(formatHotspotLabel({ label: '  Custom Spot  ' })).toBe('Custom Spot')
    })

    it('falls back to Hotspot #N when label is missing', () => {
      expect(formatHotspotLabel({}, 3)).toBe('Hotspot #3')
      expect(formatHotspotLabel({ rank: 2 })).toBe('Hotspot #2')
      expect(formatHotspotLabel({})).toBe('Hotspot #1')
    })
  })

  describe('buildHotspotPopupHtml', () => {
    it('returns empty string for invalid input', () => {
      expect(buildHotspotPopupHtml(null)).toBe('')
      expect(buildHotspotPopupHtml(undefined)).toBe('')
    })

    it('builds escaped popup card HTML with count, label, and rank', () => {
      const hotspot = {
        id: 'h1',
        lat: 17.68,
        lng: 75.88,
        count: 14,
        label: 'Depot <Gate 1>',
        category: 'Solid Waste & Trash',
      }

      const html = buildHotspotPopupHtml(hotspot, 1)

      expect(html).toContain('ns-hotspot-popup')
      expect(html).toContain('#1')
      expect(html).toContain('Depot &lt;Gate 1&gt;')
      expect(html).toContain('14 complaints')
      expect(html).toContain('Solid Waste &amp; Trash')
      expect(html).not.toContain('<script>')
    })

    it('shows zone only when provided in data and omits zone badge when missing', () => {
      const withZone = {
        id: 'h1',
        count: 5,
        zone: 'Zone A',
      }
      const withoutZone = {
        id: 'h2',
        count: 5,
      }

      const htmlWithZone = buildHotspotPopupHtml(withZone, 1)
      expect(htmlWithZone).toContain('Zone A')
      expect(htmlWithZone).toContain('ns-hotspot-popup__badge--zone')

      const htmlWithoutZone = buildHotspotPopupHtml(withoutZone, 2)
      expect(htmlWithoutZone).not.toContain('ns-hotspot-popup__badge--zone')
      expect(htmlWithoutZone).not.toContain('Zone')
    })

    it('handles zone as an object { name }', () => {
      const hotspot = {
        id: 'h1',
        count: 4,
        zone: { id: 'z1', name: 'Zone B' },
      }
      const html = buildHotspotPopupHtml(hotspot, 1)
      expect(html).toContain('Zone B')
    })

    it('never prints raw coordinate numbers in popup HTML', () => {
      const hotspot = {
        id: 'h1',
        lat: 17.681234,
        lng: 75.885678,
        count: 8,
        label: 'Central Square',
      }
      const html = buildHotspotPopupHtml(hotspot, 1)
      expect(html).not.toContain('17.681234')
      expect(html).not.toContain('75.885678')
    })
  })

  describe('findHotspotById', () => {
    const list = [
      { id: '1', count: 10 },
      { id: '2', count: 5 },
      { id: 'item_3', count: 2 },
    ]

    it('finds item by string or number id', () => {
      expect(findHotspotById(list, '1')).toEqual(list[0])
      expect(findHotspotById(list, 2)).toEqual(list[1])
      expect(findHotspotById(list, 'item_3')).toEqual(list[2])
    })

    it('returns undefined if not found or invalid args', () => {
      expect(findHotspotById(list, 'unknown')).toBeUndefined()
      expect(findHotspotById(list, '')).toBeUndefined()
      expect(findHotspotById(null, '1')).toBeUndefined()
    })
  })
})
