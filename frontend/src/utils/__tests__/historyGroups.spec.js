import { describe, expect, it } from 'vitest'
import {
  countThisWeek,
  filterByPeriod,
  formatCompletionTime,
  getDayLabel,
  getMonthBounds,
  getWeekBounds,
  groupCompletedByDay,
  isDateInThisMonth,
  isDateInThisWeek,
} from '../historyGroups'

describe('historyGroups utility', () => {
  // Reference date: Thursday, 19 Nov 2026, 16:30 local time
  const NOW = new Date(2026, 10, 19, 16, 30, 0, 0) // Month is 0-indexed: 10 = November

  describe('formatCompletionTime', () => {
    it('formats ISO timestamps to 12-hour lowercase time (e.g. 4:12 pm)', () => {
      const iso = new Date(2026, 10, 19, 16, 12, 0).toISOString()
      expect(formatCompletionTime(iso)).toMatch(/4:12\s*pm/i)
    })

    it('returns empty string for invalid or missing timestamps', () => {
      expect(formatCompletionTime(null)).toBe('')
      expect(formatCompletionTime(undefined)).toBe('')
      expect(formatCompletionTime('not-a-date')).toBe('')
    })
  })

  describe('getWeekBounds and isDateInThisWeek', () => {
    it('calculates Monday-Sunday week bounds containing reference date', () => {
      // For Thursday 19 Nov 2026:
      // Monday is 16 Nov 2026, Sunday is 22 Nov 2026
      const { start, end } = getWeekBounds(NOW)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(startDate.getFullYear()).toBe(2026)
      expect(startDate.getMonth()).toBe(10)
      expect(startDate.getDate()).toBe(16)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)

      expect(endDate.getFullYear()).toBe(2026)
      expect(endDate.getMonth()).toBe(10)
      expect(endDate.getDate()).toBe(22)
      expect(endDate.getHours()).toBe(23)
      expect(endDate.getMinutes()).toBe(59)
    })

    it('correctly identifies dates inside and outside the current week', () => {
      const mon = new Date(2026, 10, 16, 10, 0).toISOString()
      const sun = new Date(2026, 10, 22, 23, 0).toISOString()
      const prevSun = new Date(2026, 10, 15, 23, 59).toISOString()
      const nextMon = new Date(2026, 10, 23, 0, 1).toISOString()

      expect(isDateInThisWeek(mon, NOW)).toBe(true)
      expect(isDateInThisWeek(sun, NOW)).toBe(true)
      expect(isDateInThisWeek(prevSun, NOW)).toBe(false)
      expect(isDateInThisWeek(nextMon, NOW)).toBe(false)
      expect(isDateInThisWeek(null, NOW)).toBe(false)
    })
  })

  describe('getMonthBounds and isDateInThisMonth', () => {
    it('calculates 1st to last day bounds for current calendar month', () => {
      const { start, end } = getMonthBounds(NOW)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(startDate.getDate()).toBe(1)
      expect(startDate.getMonth()).toBe(10)
      expect(endDate.getDate()).toBe(30) // November has 30 days
      expect(endDate.getMonth()).toBe(10)
    })

    it('correctly identifies dates inside and outside the current month', () => {
      const first = new Date(2026, 10, 1, 10, 0).toISOString()
      const last = new Date(2026, 10, 30, 23, 0).toISOString()
      const oct = new Date(2026, 9, 31, 23, 0).toISOString()
      const dec = new Date(2026, 11, 1, 0, 0).toISOString()

      expect(isDateInThisMonth(first, NOW)).toBe(true)
      expect(isDateInThisMonth(last, NOW)).toBe(true)
      expect(isDateInThisMonth(oct, NOW)).toBe(false)
      expect(isDateInThisMonth(dec, NOW)).toBe(false)
    })
  })

  describe('filterByPeriod and countThisWeek', () => {
    const tasks = [
      { id: '1', resolved_at: new Date(2026, 10, 19, 14, 0).toISOString() }, // this week, this month
      { id: '2', resolved_at: new Date(2026, 10, 17, 10, 0).toISOString() }, // this week, this month
      { id: '3', resolved_at: new Date(2026, 10, 5, 9, 0).toISOString() }, // earlier this month, not this week
      { id: '4', resolved_at: new Date(2026, 9, 20, 11, 0).toISOString() }, // last month
    ]

    it('counts tasks completed this week', () => {
      expect(countThisWeek(tasks, NOW)).toBe(2)
      expect(countThisWeek([], NOW)).toBe(0)
    })

    it('filters tasks by week', () => {
      const filtered = filterByPeriod(tasks, 'week', NOW)
      expect(filtered.map((t) => t.id)).toEqual(['1', '2'])
    })

    it('filters tasks by month', () => {
      const filtered = filterByPeriod(tasks, 'month', NOW)
      expect(filtered.map((t) => t.id)).toEqual(['1', '2', '3'])
    })
  })

  describe('getDayLabel', () => {
    it('returns TODAY for dates matching reference day', () => {
      const todayIso = new Date(2026, 10, 19, 10, 0).toISOString()
      expect(getDayLabel(todayIso, NOW)).toBe('TODAY')
    })

    it('returns YESTERDAY for dates matching 1 day before reference day', () => {
      const yesterdayIso = new Date(2026, 10, 18, 22, 0).toISOString()
      expect(getDayLabel(yesterdayIso, NOW)).toBe('YESTERDAY')
    })

    it('returns uppercase formatted weekday and date for older days (e.g. THURSDAY, 12 NOV)', () => {
      const olderIso = new Date(2026, 10, 12, 11, 0).toISOString()
      const label = getDayLabel(olderIso, NOW)
      expect(label).toBe('THURSDAY, 12 NOV')
    })

    it('returns EARLIER for missing or invalid dates', () => {
      expect(getDayLabel(null, NOW)).toBe('EARLIER')
      expect(getDayLabel('invalid-date', NOW)).toBe('EARLIER')
    })
  })

  describe('groupCompletedByDay', () => {
    it('groups tasks by day newest first', () => {
      const tasks = [
        { id: 't-old', resolved_at: new Date(2026, 10, 12, 10, 0).toISOString() },
        { id: 't-today-1', resolved_at: new Date(2026, 10, 19, 11, 0).toISOString() },
        { id: 't-today-2', resolved_at: new Date(2026, 10, 19, 15, 0).toISOString() },
        { id: 't-yesterday', resolved_at: new Date(2026, 10, 18, 14, 0).toISOString() },
      ]

      const groups = groupCompletedByDay(tasks, NOW)
      expect(groups).toHaveLength(3)

      expect(groups[0].label).toBe('TODAY')
      expect(groups[0].items.map((t) => t.id)).toEqual(['t-today-2', 't-today-1'])

      expect(groups[1].label).toBe('YESTERDAY')
      expect(groups[1].items.map((t) => t.id)).toEqual(['t-yesterday'])

      expect(groups[2].label).toBe('THURSDAY, 12 NOV')
      expect(groups[2].items.map((t) => t.id)).toEqual(['t-old'])
    })

    it('handles empty task list gracefully', () => {
      expect(groupCompletedByDay([], NOW)).toEqual([])
      expect(groupCompletedByDay(null, NOW)).toEqual([])
    })
  })
})
