import { formatDateTime } from './formatDate'
import { isOverdue, timeLeftLabel } from './taskDisplay'
import { buildDirectionsUrl } from './googleMaps'

/**
 * Derives the 3-step vertical timeline (Submitted, In-Progress, Completed)
 * with step state (done, current, future) and associated timestamp from
 * complaint data and event logs.
 *
 * @param {object} complaint
 * @returns {Array<{ name: string, state: 'done'|'current'|'future', timestamp: string|null, formattedTime: string }>}
 */
export function getTimelineSteps(complaint) {
  if (!complaint || typeof complaint !== 'object') {
    return [
      { name: 'Submitted', state: 'future', timestamp: null, formattedTime: '' },
      { name: 'In-Progress', state: 'future', timestamp: null, formattedTime: '' },
      { name: 'Completed', state: 'future', timestamp: null, formattedTime: '' },
    ]
  }

  const status = complaint.status || 'Submitted'
  const logs = Array.isArray(complaint.logs) ? complaint.logs : []

  // Extract timestamps
  let submittedTime = complaint.created_at || null
  let inProgressTime = null
  let completedTime = complaint.resolved_at || complaint.resolution?.completed_at || null

  for (const log of logs) {
    const type = (log?.event_type || '').toLowerCase()
    if (!submittedTime && type === 'created') {
      submittedTime = log.created_at
    }
    if (!inProgressTime && (type === 'started' || type === 'assigned' || type === 'in_progress')) {
      inProgressTime = log.created_at
    }
    if (!completedTime && (type === 'resolved' || type === 'completed')) {
      completedTime = log.created_at
    }
  }

  // Derive step states
  let submittedState = 'future'
  let inProgressState = 'future'
  let completedState = 'future'

  if (status === 'Submitted') {
    submittedState = 'current'
  } else if (status === 'In-Progress') {
    submittedState = 'done'
    inProgressState = 'current'
  } else if (status === 'Completed') {
    submittedState = 'done'
    inProgressState = 'done'
    completedState = 'done'
  }

  return [
    {
      name: 'Submitted',
      state: submittedState,
      timestamp: submittedTime,
      formattedTime: submittedTime ? formatDateTime(submittedTime) : '',
    },
    {
      name: 'In-Progress',
      state: inProgressState,
      timestamp: inProgressTime,
      formattedTime: inProgressTime ? formatDateTime(inProgressTime) : '',
    },
    {
      name: 'Completed',
      state: completedState,
      timestamp: completedTime,
      formattedTime: completedTime ? formatDateTime(completedTime) : '',
    },
  ]
}

/**
 * Returns formatted overdue day count string, e.g. "Overdue 1 day" or "Overdue 3 days",
 * or null if the complaint is not overdue or has been completed.
 *
 * @param {object} complaint
 * @param {Date|number} [now=Date.now()]
 * @returns {string|null}
 */
export function formatOverdueDays(complaint, now = Date.now()) {
  if (!complaint || complaint.status === 'Completed') {
    return null
  }

  if (!isOverdue(complaint, now)) {
    return null
  }

  if (complaint.sla_deadline) {
    const targetMs = new Date(complaint.sla_deadline).getTime()
    const nowMs = now instanceof Date ? now.getTime() : Number(now)

    if (!Number.isNaN(targetMs) && !Number.isNaN(nowMs) && nowMs > targetMs) {
      const diffMs = nowMs - targetMs
      const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
      return `Overdue ${days} ${days === 1 ? 'day' : 'days'}`
    }
  }

  if (complaint.is_overdue) {
    return 'Overdue'
  }

  return null
}

/**
 * Resolves deadline badge / pill representation for the assigned worker card.
 *
 * @param {object} complaint
 * @param {Date|number} [now=Date.now()]
 * @returns {{ label: string, tone: 'overdue'|'due'|'completed', className: string }|null}
 */
export function getWorkerDeadlinePill(complaint, now = Date.now()) {
  if (!complaint || typeof complaint !== 'object') {
    return null
  }

  if (complaint.status === 'Completed') {
    return {
      label: 'Completed',
      tone: 'completed',
      className: 'deadline-pill--completed',
    }
  }

  const info = timeLeftLabel(complaint, now)
  if (info) {
    return {
      label: info.label,
      tone: info.tone,
      className: info.tone === 'overdue' ? 'deadline-pill--overdue' : 'deadline-pill--due',
    }
  }

  if (complaint.is_overdue) {
    return {
      label: 'Overdue',
      tone: 'overdue',
      className: 'deadline-pill--overdue',
    }
  }

  return null
}

/**
 * Returns safe location metadata for the complaint summary.
 * Never outputs raw coordinates in displayable strings.
 *
 * @param {object} complaint
 * @returns {{ hasCoordinates: boolean, zoneName: string, mapUrl: string|null }}
 */
export function getComplaintLocation(complaint) {
  const zoneName = complaint?.zone?.name || '—'
  const lat = complaint?.latitude
  const lng = complaint?.longitude
  const hasCoordinates =
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)

  return {
    hasCoordinates,
    zoneName,
    mapUrl: hasCoordinates ? buildDirectionsUrl(lat, lng) : null,
  }
}
