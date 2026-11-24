import { describe, expect, it } from 'vitest'
import {
  formatOverdueDays,
  getComplaintLocation,
  getTimelineSteps,
  getWorkerDeadlinePill,
} from '../complaintTimeline'

describe('complaintTimeline utility', () => {
  const baseComplaint = {
    id: 'c1',
    tracking_code: 'SAN-20261114-1001',
    status: 'Submitted',
    created_at: '2026-11-14T09:00:00Z',
    sla_deadline: '2026-11-14T18:00:00Z',
    is_overdue: false,
    zone: { id: 'z1', name: 'Zone A' },
    latitude: 17.68,
    longitude: 75.88,
    logs: [
      { event_type: 'created', created_at: '2026-11-14T09:00:00Z' },
    ],
  }

  describe('getTimelineSteps', () => {
    it('returns 3 steps in future state for null or empty input', () => {
      const steps = getTimelineSteps(null)
      expect(steps).toHaveLength(3)
      expect(steps.map((s) => s.name)).toEqual(['Submitted', 'In-Progress', 'Completed'])
      expect(steps.every((s) => s.state === 'future')).toBe(true)
      expect(steps.every((s) => s.timestamp === null)).toBe(true)
    })

    it('marks Submitted as current and others as future when status is Submitted', () => {
      const steps = getTimelineSteps(baseComplaint)
      expect(steps[0].state).toBe('current')
      expect(steps[0].timestamp).toBe('2026-11-14T09:00:00Z')
      expect(steps[0].formattedTime).toContain('14 Nov')
      expect(steps[1].state).toBe('future')
      expect(steps[2].state).toBe('future')
    })

    it('marks Submitted as done and In-Progress as current when status is In-Progress', () => {
      const inProgressComplaint = {
        ...baseComplaint,
        status: 'In-Progress',
        logs: [
          { event_type: 'created', created_at: '2026-11-14T09:00:00Z' },
          { event_type: 'started', created_at: '2026-11-14T11:30:00Z' },
        ],
      }
      const steps = getTimelineSteps(inProgressComplaint)
      expect(steps[0].state).toBe('done')
      expect(steps[0].timestamp).toBe('2026-11-14T09:00:00Z')
      expect(steps[1].state).toBe('current')
      expect(steps[1].timestamp).toBe('2026-11-14T11:30:00Z')
      expect(steps[2].state).toBe('future')
    })

    it('marks all three steps as done when status is Completed', () => {
      const completedComplaint = {
        ...baseComplaint,
        status: 'Completed',
        resolved_at: '2026-11-14T15:00:00Z',
        logs: [
          { event_type: 'created', created_at: '2026-11-14T09:00:00Z' },
          { event_type: 'assigned', created_at: '2026-11-14T10:00:00Z' },
          { event_type: 'resolved', created_at: '2026-11-14T15:00:00Z' },
        ],
      }
      const steps = getTimelineSteps(completedComplaint)
      expect(steps[0].state).toBe('done')
      expect(steps[1].state).toBe('done')
      expect(steps[2].state).toBe('done')
      expect(steps[1].timestamp).toBe('2026-11-14T10:00:00Z')
      expect(steps[2].timestamp).toBe('2026-11-14T15:00:00Z')
    })
  })

  describe('formatOverdueDays', () => {
    it('returns null if not overdue', () => {
      const now = new Date('2026-11-14T12:00:00Z').getTime()
      expect(formatOverdueDays(baseComplaint, now)).toBeNull()
    })

    it('returns null if completed even if deadline passed', () => {
      const completed = {
        ...baseComplaint,
        status: 'Completed',
        is_overdue: true,
      }
      const now = new Date('2026-11-16T12:00:00Z').getTime()
      expect(formatOverdueDays(completed, now)).toBeNull()
    })

    it('returns "Overdue 1 day" when deadline passed within 24 hours', () => {
      const now = new Date('2026-11-14T22:00:00Z').getTime() // 4 hours after deadline
      expect(formatOverdueDays(baseComplaint, now)).toBe('Overdue 1 day')
    })

    it('returns "Overdue 3 days" when deadline passed 3 days ago', () => {
      const now = new Date('2026-11-17T18:00:00Z').getTime() // 3 days after deadline
      expect(formatOverdueDays(baseComplaint, now)).toBe('Overdue 3 days')
    })

    it('returns "Overdue" when is_overdue is true without sla_deadline', () => {
      const noDeadline = {
        status: 'In-Progress',
        is_overdue: true,
        sla_deadline: '',
      }
      expect(formatOverdueDays(noDeadline)).toBe('Overdue')
    })
  })

  describe('getWorkerDeadlinePill', () => {
    it('returns completed pill when status is Completed', () => {
      const pill = getWorkerDeadlinePill({ status: 'Completed' })
      expect(pill).toEqual({
        label: 'Completed',
        tone: 'completed',
        className: 'deadline-pill--completed',
      })
    })

    it('returns due pill when deadline is in the future', () => {
      const now = new Date('2026-11-14T15:00:00Z').getTime() // 3h before 18:00
      const pill = getWorkerDeadlinePill(baseComplaint, now)
      expect(pill?.tone).toBe('due')
      expect(pill?.label).toBe('Due in 3 h')
      expect(pill?.className).toBe('deadline-pill--due')
    })

    it('returns overdue pill when deadline is in the past', () => {
      const now = new Date('2026-11-14T21:00:00Z').getTime() // 3h after 18:00
      const pill = getWorkerDeadlinePill(baseComplaint, now)
      expect(pill?.tone).toBe('overdue')
      expect(pill?.label).toBe('Overdue 3 h')
      expect(pill?.className).toBe('deadline-pill--overdue')
    })

    it('returns fallback overdue pill when is_overdue without sla_deadline', () => {
      const pill = getWorkerDeadlinePill({ status: 'In-Progress', is_overdue: true })
      expect(pill).toEqual({
        label: 'Overdue',
        tone: 'overdue',
        className: 'deadline-pill--overdue',
      })
    })

    it('returns null when no deadline or overdue info is present', () => {
      expect(getWorkerDeadlinePill(null)).toBeNull()
      expect(getWorkerDeadlinePill({ status: 'Submitted' })).toBeNull()
    })
  })

  describe('getComplaintLocation', () => {
    it('returns hasCoordinates true and directions url when coordinates are valid numbers', () => {
      const loc = getComplaintLocation(baseComplaint)
      expect(loc.hasCoordinates).toBe(true)
      expect(loc.zoneName).toBe('Zone A')
      expect(loc.mapUrl).toBe('https://www.google.com/maps/dir/?api=1&destination=17.68%2C75.88')
    })

    it('returns hasCoordinates false and null mapUrl when coordinates are missing', () => {
      const loc = getComplaintLocation({ zone: { name: 'Zone B' } })
      expect(loc.hasCoordinates).toBe(false)
      expect(loc.zoneName).toBe('Zone B')
      expect(loc.mapUrl).toBeNull()
    })

    it('uses fallback zone dash when zone object is missing', () => {
      const loc = getComplaintLocation({})
      expect(loc.zoneName).toBe('—')
    })
  })
})
