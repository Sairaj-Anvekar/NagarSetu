import { MockHttpError } from './mockAdapter'
import { normalizePhone, readMockSession } from './mockAuth'
import { MOCK_DEPARTMENTS, MOCK_WORKERS, MOCK_ZONES } from './mockData'

function requireAdmin(headers) {
  const session = readMockSession(headers)

  if (!session) {
    throw new MockHttpError(401, 'Not authenticated')
  }

  if (session.role !== 'admin') {
    throw new MockHttpError(403, 'Not enough permissions')
  }

  return session
}

function toAdminWorker(worker) {
  return {
    id: worker.id,
    name: worker.name,
    phone: worker.phone,
    department: worker.department,
    zone: worker.zone,
    is_active: worker.is_active,
  }
}

function handleGetWorkers({ headers }) {
  requireAdmin(headers)

  const items = MOCK_WORKERS.map(toAdminWorker)

  return {
    status: 200,
    data: {
      items,
      total: items.length,
      page: 1,
      page_size: 100,
    },
  }
}

function handlePostWorker({ headers, body }) {
  requireAdmin(headers)

  const errors = []

  const rawName = body?.name
  const trimmedName = typeof rawName === 'string' ? rawName.trim() : ''
  if (trimmedName.length < 2) {
    errors.push({ loc: ['body', 'name'], msg: 'Name must be at least 2 characters' })
  }

  const normalizedPhone = normalizePhone(body?.phone)
  if (typeof normalizedPhone !== 'string' || !/^\+\d{10,15}$/.test(normalizedPhone)) {
    errors.push({ loc: ['body', 'phone'], msg: 'Enter a valid phone number' })
  }

  const pin = body?.pin
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    errors.push({ loc: ['body', 'pin'], msg: 'PIN must be exactly 4 digits' })
  }

  const department = MOCK_DEPARTMENTS.find((d) => d.id === body?.department_id)
  if (!department) {
    errors.push({ loc: ['body', 'department_id'], msg: 'Choose a department' })
  }

  const zone = MOCK_ZONES.find((z) => z.id === body?.zone_id)
  if (!zone) {
    errors.push({ loc: ['body', 'zone_id'], msg: 'Choose a zone' })
  }

  if (errors.length > 0) {
    throw new MockHttpError(422, errors)
  }

  const phoneExists = MOCK_WORKERS.some((w) => w.phone === normalizedPhone)
  if (phoneExists) {
    throw new MockHttpError(409, 'A worker with this phone number already exists')
  }

  const maxId = MOCK_WORKERS.reduce((max, w) => {
    const num = parseInt(w.id, 10)
    return !isNaN(num) && num > max ? num : max
  }, 0)
  const newId = String(maxId + 1)

  const newWorker = {
    id: newId,
    name: trimmedName,
    phone: normalizedPhone,
    pin,
    is_active: true,
    department_id: department.id,
    department: department.name,
    zone_id: zone.id,
    zone: zone.name,
  }

  MOCK_WORKERS.push(newWorker)

  return {
    status: 201,
    data: toAdminWorker(newWorker),
  }
}

function handlePatchWorker({ headers, params, body }) {
  requireAdmin(headers)

  if (!body || typeof body.is_active !== 'boolean') {
    throw new MockHttpError(422, [{ msg: 'Field required' }])
  }

  const worker = MOCK_WORKERS.find((w) => w.id === params.id)
  if (!worker) {
    throw new MockHttpError(404, 'Worker not found')
  }

  if (params.id === '105') {
    throw new MockHttpError(500, 'Internal server error')
  }

  worker.is_active = body.is_active

  return {
    status: 200,
    data: toAdminWorker(worker),
  }
}

export const workerAdminRoutes = [
  {
    method: 'GET',
    path: '/workers',
    handler: handleGetWorkers,
  },
  {
    method: 'POST',
    path: '/workers',
    handler: handlePostWorker,
  },
  {
    method: 'PATCH',
    path: '/workers/:id',
    handler: handlePatchWorker,
  },
]
