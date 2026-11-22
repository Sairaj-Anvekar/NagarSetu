import { describe, expect, it } from 'vitest'
import { countsByFilter, isOverdue, timeLeftLabel } from '../taskDisplay'

// A fixed "now" so every test is fully deterministic.
// 2026-01-15T12:00:00.000Z
const NOW = new Date('2026-01-15T12:00:00.000Z').getTime()

function makeTask(overrides = {}) {
  return {
    id: 't1',
    status: 'Submitted',
    sla_deadline: null,
    is_overdue: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------
describe('isOverdue', () => {
  it('returns false for a Completed task even when the deadline is in the past', () => {
    const task = makeTask({ status: 'Completed', sla_deadline: '2026-01-01T00:00:00.000Z' })
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('returns false for a Completed task with no deadline, even when is_overdue is true', () => {
    const task = makeTask({ status: 'Completed', is_overdue: true })
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('returns true when sla_deadline is in the past (Submitted task)', () => {
    const task = makeTask({ sla_deadline: '2026-01-14T00:00:00.000Z' })
    expect(isOverdue(task, NOW)).toBe(true)
  })

  it('returns true when sla_deadline is in the past (In-Progress task)', () => {
    const task = makeTask({ status: 'In-Progress', sla_deadline: '2026-01-14T00:00:00.000Z' })
    expect(isOverdue(task, NOW)).toBe(true)
  })

  it('returns false when sla_deadline is in the future', () => {
    const task = makeTask({ sla_deadline: '2026-01-16T00:00:00.000Z' })
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('falls back to task.is_overdue=true when sla_deadline is missing', () => {
    const task = makeTask({ sla_deadline: null, is_overdue: true })
    expect(isOverdue(task, NOW)).toBe(true)
  })

  it('falls back to task.is_overdue=false when sla_deadline is missing', () => {
    const task = makeTask({ sla_deadline: null, is_overdue: false })
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('accepts now as a Date object', () => {
    const task = makeTask({ sla_deadline: '2026-01-14T00:00:00.000Z' })
    expect(isOverdue(task, new Date(NOW))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// timeLeftLabel
// ---------------------------------------------------------------------------
describe('timeLeftLabel', () => {
  it('returns null when sla_deadline is absent (null)', () => {
    expect(timeLeftLabel(makeTask({ sla_deadline: null }), NOW)).toBeNull()
  })

  it('returns null when sla_deadline is an empty string', () => {
    expect(timeLeftLabel(makeTask({ sla_deadline: '' }), NOW)).toBeNull()
  })

  it('returns null when sla_deadline is not a valid ISO string', () => {
    expect(timeLeftLabel(makeTask({ sla_deadline: 'not-a-date' }), NOW)).toBeNull()
  })

  it('returns "Overdue 2 days" for a deadline exactly 2 days in the past', () => {
    // NOW = 2026-01-15T12:00:00Z; 2 days ago = 2026-01-13T12:00:00Z
    const task = makeTask({ sla_deadline: '2026-01-13T12:00:00.000Z' })
    expect(timeLeftLabel(task, NOW)).toEqual({ label: 'Overdue 2 days', tone: 'overdue' })
  })

  it('returns "Overdue 3 h" for a deadline 3 hours in the past', () => {
    // 3 h ago = 2026-01-15T09:00:00Z
    const task = makeTask({ sla_deadline: '2026-01-15T09:00:00.000Z' })
    expect(timeLeftLabel(task, NOW)).toEqual({ label: 'Overdue 3 h', tone: 'overdue' })
  })

  it('returns "Due in 3 h" for a deadline 3 hours in the future', () => {
    // 3 h ahead = 2026-01-15T15:00:00Z
    const task = makeTask({ sla_deadline: '2026-01-15T15:00:00.000Z' })
    expect(timeLeftLabel(task, NOW)).toEqual({ label: 'Due in 3 h', tone: 'due' })
  })

  it('returns "Due in 2 days" for a deadline 2 days in the future', () => {
    // 2 days ahead = 2026-01-17T12:00:00Z
    const task = makeTask({ sla_deadline: '2026-01-17T12:00:00.000Z' })
    expect(timeLeftLabel(task, NOW)).toEqual({ label: 'Due in 2 days', tone: 'due' })
  })

  it('returns a "min" label for a deadline less than 1 hour away', () => {
    // 30 min from now = 2026-01-15T12:30:00Z
    const task = makeTask({ sla_deadline: '2026-01-15T12:30:00.000Z' })
    const result = timeLeftLabel(task, NOW)
    expect(result?.tone).toBe('due')
    expect(result?.label).toMatch(/^Due in \d+ min$/)
  })

  it('accepts now as a Date object', () => {
    const task = makeTask({ sla_deadline: '2026-01-15T15:00:00.000Z' })
    expect(timeLeftLabel(task, new Date(NOW))).toEqual({ label: 'Due in 3 h', tone: 'due' })
  })
})

// ---------------------------------------------------------------------------
// countsByFilter
// ---------------------------------------------------------------------------
describe('countsByFilter', () => {
  // 2 Submitted (1 overdue) + 2 In-Progress (1 overdue) = 4 tasks, 2 overdue
  const tasks = [
    makeTask({ status: 'Submitted', sla_deadline: '2026-01-14T00:00:00.000Z' }),  // overdue
    makeTask({ status: 'Submitted', sla_deadline: '2026-01-16T00:00:00.000Z' }),  // not overdue
    makeTask({ status: 'In-Progress', sla_deadline: '2026-01-14T00:00:00.000Z' }), // overdue
    makeTask({ status: 'In-Progress', sla_deadline: '2026-01-20T00:00:00.000Z' }), // not overdue
  ]

  it('returns correct all, submitted, inProgress and overdue counts', () => {
    expect(countsByFilter(tasks, NOW)).toEqual({
      all: 4,
      submitted: 2,
      inProgress: 2,
      overdue: 2,
    })
  })

  it('returns all zeros for an empty array', () => {
    expect(countsByFilter([], NOW)).toEqual({
      all: 0,
      submitted: 0,
      inProgress: 0,
      overdue: 0,
    })
  })

  it('does not count a Completed task as overdue even when its deadline is past', () => {
    const withCompleted = [
      ...tasks,
      makeTask({ status: 'Completed', sla_deadline: '2026-01-14T00:00:00.000Z' }),
    ]
    const counts = countsByFilter(withCompleted, NOW)
    expect(counts.overdue).toBe(2)   // still 2, not 3
    expect(counts.all).toBe(5)
  })

  it('counts a task with no deadline as overdue only via its is_overdue flag', () => {
    const tasksWithFlag = [
      makeTask({ status: 'Submitted', sla_deadline: null, is_overdue: true }),
      makeTask({ status: 'Submitted', sla_deadline: null, is_overdue: false }),
    ]
    expect(countsByFilter(tasksWithFlag, NOW)).toEqual({
      all: 2,
      submitted: 2,
      inProgress: 0,
      overdue: 1,
    })
  })

  it('accepts now as a Date object', () => {
    const counts = countsByFilter(tasks, new Date(NOW))
    expect(counts.overdue).toBe(2)
  })
})
