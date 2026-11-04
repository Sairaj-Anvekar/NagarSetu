import { MockHttpError } from './mockAdapter'
import { readMockSession } from './mockAuth'
import { MOCK_DEPARTMENTS, MOCK_ZONES } from './mockData'

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

function handleGetDepartments({ headers }) {
  requireAdmin(headers)

  const items = MOCK_DEPARTMENTS.map((dept) => ({ id: dept.id, name: dept.name }))

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

function handleGetZones({ headers }) {
  requireAdmin(headers)

  const items = MOCK_ZONES.map((zone) => ({ id: zone.id, name: zone.name }))

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

export const referenceRoutes = [
  {
    method: 'GET',
    path: '/departments',
    handler: handleGetDepartments,
  },
  {
    method: 'GET',
    path: '/zones',
    handler: handleGetZones,
  },
]

