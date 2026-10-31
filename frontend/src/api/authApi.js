import http from './http'

/**
 * Attempt an admin login.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ token: string, role: 'admin', user: object|null }>}
 */
export async function loginAdmin({ username, password }) {
  const response = await http.post(
    '/auth/admin/login',
    { username, password },
    { skipAuthRedirect: true },
  )

  const token = response.data.access_token
  if (!token) {
    throw new Error('Login response did not include a token')
  }

  return {
    token,
    role: 'admin',
    user: response.data.user ?? null,
  }
}

/**
 * Attempt a worker login.
 *
 * @param {{ phone: string, pin: string }} credentials  (pin is a 4-digit string)
 * @returns {Promise<{ token: string, role: 'worker', user: object|null }>}
 */
export async function loginWorker({ phone, pin }) {
  const response = await http.post(
    '/auth/worker/login',
    { phone, pin },
    { skipAuthRedirect: true },
  )

  const token = response.data.access_token
  if (!token) {
    throw new Error('Login response did not include a token')
  }

  return {
    token,
    role: 'worker',
    user: response.data.user ?? null,
  }
}
