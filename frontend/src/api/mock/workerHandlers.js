import { MockHttpError } from './mockAdapter'
import { readMockSession } from './mockAuth'
import { MOCK_TASKS } from './mockData'

const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

function handleGetMyTasks({ headers }) {
  const session = readMockSession(headers)

  if (!session) {
    throw new MockHttpError(401, 'Not authenticated')
  }

  if (session.role !== 'worker') {
    throw new MockHttpError(403, 'Not enough permissions')
  }

  if (session.id === '105') {
    throw new MockHttpError(500, 'Internal server error')
  }

  const now = Date.now()
  const workerTasks = MOCK_TASKS.filter((task) => task.worker_id === session.id)

  const items = workerTasks.map((task) => ({
    id: task.id,
    tracking_code: task.tracking_code,
    category: task.category,
    description: task.description,
    image_url: null,
    latitude: task.latitude,
    longitude: task.longitude,
    priority: task.priority,
    status: task.status,
    sla_deadline: new Date(now + task.dueInHours * 3600000).toISOString(),
    is_overdue: task.dueInHours < 0
  }))

  const sortedItems = [...items].sort((a, b) => {
    if (a.is_overdue !== b.is_overdue) {
      return a.is_overdue ? -1 : 1
    }

    const rankA = PRIORITY_ORDER[a.priority] ?? 99
    const rankB = PRIORITY_ORDER[b.priority] ?? 99
    if (rankA !== rankB) {
      return rankA - rankB
    }

    return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime()
  })

  return {
    status: 200,
    data: {
      items: sortedItems,
      total: sortedItems.length,
      page: 1,
      page_size: 20
    }
  }
}

export const workerRoutes = [
  {
    method: 'GET',
    path: '/workers/me/tasks',
    handler: handleGetMyTasks
  }
]


