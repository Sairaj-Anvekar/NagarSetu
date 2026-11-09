import { MockHttpError } from './mockAdapter'
import { readMockSession } from './mockAuth'
import { MOCK_TASKS, MOCK_RESOLUTIONS } from './mockData'
import { toTaskPayload } from './workerHandlers'
import {
  DEFER_REASON_MAX,
  DEFER_REASON_MIN,
  NOTE_MAX,
  NOTE_MIN,
  validatePhoto,
} from '../../utils/resolutionLimits'

/**
 * Validate that the caller has an active worker session.
 *
 * @param {Record<string, string>} headers
 * @returns {{ role: string, id: string }}
 */
export function requireWorkerSession(headers) {
  const session = readMockSession(headers)
  if (!session) {
    throw new MockHttpError(401, 'Not authenticated')
  }
  if (session.role !== 'worker') {
    throw new MockHttpError(403, 'Not enough permissions')
  }
  return session
}

/**
 * Find a task assigned to the current worker.
 *
 * @param {string} id
 * @param {{ id: string }} session
 * @returns {object}
 */
export function findAssignedTask(id, session) {
  const task = MOCK_TASKS.find((t) => t.id === id && t.worker_id === session.id)
  if (!task) {
    throw new MockHttpError(404, 'Complaint not found')
  }
  return task
}

/**
 * Deliberate failure demo check for task t4.
 *
 * @param {string} id
 */
export function assertNotFailureDemo(id) {
  if (id === 't4') {
    throw new MockHttpError(500, 'Internal server error')
  }
}

function handleGetComplaint({ params, headers }) {
  const session = requireWorkerSession(headers)
  const id = decodeURIComponent(params.id)
  const task = findAssignedTask(id, session)

  if (task.status === 'Completed') {
    throw new MockHttpError(404, 'Complaint not found')
  }

  return {
    status: 200,
    data: toTaskPayload(task),
  }
}

function handleStartComplaint({ params, headers }) {
  const session = requireWorkerSession(headers)
  const id = decodeURIComponent(params.id)
  const task = findAssignedTask(id, session)

  assertNotFailureDemo(id)

  if (task.status !== 'Submitted') {
    throw new MockHttpError(409, 'Complaint cannot be started in its current state')
  }

  task.status = 'In-Progress'

  return {
    status: 200,
    data: toTaskPayload(task),
  }
}

function handleCompleteComplaint({ body, params, headers }) {
  const session = requireWorkerSession(headers)

  let photo = null
  let note = null

  if (body instanceof FormData || (body && typeof body.get === 'function')) {
    photo = body.get('photo')
    note = body.get('note')
  } else if (body && typeof body === 'object') {
    photo = body.photo
    note = body.note
  }

  const errors = []
  const photoError = validatePhoto(photo)
  if (photoError) {
    errors.push({ loc: ['body', 'photo'], msg: photoError })
  }

  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  if (typeof note !== 'string' || trimmedNote.length < NOTE_MIN || trimmedNote.length > NOTE_MAX) {
    errors.push({ loc: ['body', 'note'], msg: 'Note must be 10 to 500 characters' })
  }

  if (errors.length > 0) {
    throw new MockHttpError(422, errors)
  }

  const id = decodeURIComponent(params.id)
  const task = findAssignedTask(id, session)

  assertNotFailureDemo(id)

  if (task.status !== 'In-Progress') {
    throw new MockHttpError(409, 'Complaint must be started before it can be completed')
  }

  task.status = 'Completed'

  MOCK_RESOLUTIONS.push({
    complaint_id: task.id,
    worker_id: session.id,
    note: trimmedNote,
    photo_name: photo?.name ?? '',
    photo_type: photo?.type ?? '',
    photo_size: photo?.size ?? 0,
    completed_at: new Date().toISOString(),
  })

  return {
    status: 200,
    data: toTaskPayload(task),
  }
}

function handleDeferComplaint({ body, params, headers }) {
  const session = requireWorkerSession(headers)

  const reason = body?.reason
  const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
  if (
    typeof reason !== 'string' ||
    trimmedReason.length < DEFER_REASON_MIN ||
    trimmedReason.length > DEFER_REASON_MAX
  ) {
    throw new MockHttpError(422, [
      { loc: ['body', 'reason'], msg: 'Reason must be 5 to 300 characters' },
    ])
  }

  const id = decodeURIComponent(params.id)
  const task = findAssignedTask(id, session)

  assertNotFailureDemo(id)

  if (task.status === 'Completed') {
    throw new MockHttpError(409, 'Completed complaints cannot be deferred')
  }

  task.carry_forward_count = (task.carry_forward_count || 0) + 1
  if (task.status === 'In-Progress') {
    task.status = 'Submitted'
  }
  task.worker_id = ''

  return {
    status: 200,
    data: toTaskPayload(task),
  }
}

export const complaintRoutes = [
  {
    method: 'GET',
    path: '/complaints/:id',
    handler: handleGetComplaint,
  },
  {
    method: 'PATCH',
    path: '/complaints/:id/start',
    handler: handleStartComplaint,
  },
  {
    method: 'PATCH',
    path: '/complaints/:id/complete',
    handler: handleCompleteComplaint,
  },
  {
    method: 'PATCH',
    path: '/complaints/:id/defer',
    handler: handleDeferComplaint,
  },
]
