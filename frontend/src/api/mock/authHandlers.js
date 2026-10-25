import { MockHttpError } from './mockAdapter'
import { MOCK_ADMINS, MOCK_WORKERS } from './mockData'
import { makeMockToken, normalizePhone } from './mockAuth'

function handleAdminLogin({ body }) {
  const username = body?.username
  const password = body?.password

  if (
    !username ||
    !password ||
    (typeof username === 'string' && !username.trim()) ||
    (typeof password === 'string' && !password.trim())
  ) {
    throw new MockHttpError(422, [{ msg: 'Field required' }])
  }

  const admin = MOCK_ADMINS.find((a) => a.username === username && a.password === password)
  if (!admin) {
    throw new MockHttpError(401, 'Incorrect credentials')
  }

  return {
    status: 200,
    data: {
      access_token: makeMockToken('admin', String(admin.id)),
      token_type: 'bearer',
      user: {
        id: String(admin.id),
        name: admin.name,
        role: 'admin'
      }
    }
  }
}

function handleWorkerLogin({ body }) {
  const phone = body?.phone
  const pin = body?.pin

  if (
    !phone ||
    !pin ||
    (typeof phone === 'string' && !phone.trim()) ||
    (typeof pin === 'string' && !pin.trim())
  ) {
    throw new MockHttpError(422, [{ msg: 'Field required' }])
  }

  const normalized = normalizePhone(phone)
  const worker = MOCK_WORKERS.find((w) => w.phone === normalized && w.pin === pin)

  if (!worker) {
    throw new MockHttpError(401, 'Incorrect credentials')
  }

  if (!worker.is_active) {
    throw new MockHttpError(403, 'Account is deactivated')
  }

  return {
    status: 200,
    data: {
      access_token: makeMockToken('worker', String(worker.id)),
      token_type: 'bearer',
      user: {
        id: String(worker.id),
        name: worker.name,
        role: 'worker'
      }
    }
  }
}

export const authRoutes = [
  {
    method: 'POST',
    path: '/auth/admin/login',
    handler: handleAdminLogin
  },
  {
    method: 'POST',
    path: '/auth/worker/login',
    handler: handleWorkerLogin
  }
]
