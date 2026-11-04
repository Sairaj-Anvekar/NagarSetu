import { MockHttpError } from './mockAdapter'
import { readMockSession } from './mockAuth'
import { MOCK_WORKERS } from './mockData'

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
    method: 'PATCH',
    path: '/workers/:id',
    handler: handlePatchWorker,
  },
]

