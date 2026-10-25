import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from '../mockAdapter'
import { authRoutes } from '../authHandlers'

describe('authHandlers - admin login', () => {
  const client = axios.create({
    adapter: createMockAdapter(authRoutes, { delayMs: 0 })
  })

  it('authenticates admin successfully and returns token and user data without password', async () => {
    const res = await client.post('/auth/admin/login', {
      username: 'admin',
      password: 'admin123'
    })

    expect(res.status).toBe(200)
    expect(res.data.token_type).toBe('bearer')
    expect(res.data.access_token).toMatch(/^mock-token-admin-/)
    expect(typeof res.data.user.id).toBe('string')
    expect(res.data.user.role).toBe('admin')
    expect(JSON.stringify(res.data)).not.toContain('admin123')
  })

  it('rejects with 401 on wrong password', async () => {
    await expect(
      client.post('/auth/admin/login', { username: 'admin', password: 'wrongpassword' })
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: { detail: 'Incorrect credentials' }
      }
    })
  })

  it('rejects with 422 and detail array on missing or empty username', async () => {
    await expect(
      client.post('/auth/admin/login', { username: '', password: 'admin123' })
    ).rejects.toMatchObject({
      response: {
        status: 422,
        data: { detail: [{ msg: 'Field required' }] }
      }
    })
  })
})

describe('authHandlers - worker login', () => {
  const client = axios.create({
    adapter: createMockAdapter(authRoutes, { delayMs: 0 })
  })

  it('authenticates worker with 10 digits, +91 prefix, and spaced phone number', async () => {
    const formats = ['9876543210', '+919876543210', '98765 43210']
    for (const phone of formats) {
      const res = await client.post('/auth/worker/login', { phone, pin: '1234' })
      expect(res.status).toBe(200)
      expect(res.data.token_type).toBe('bearer')
      expect(res.data.access_token).toBe('mock-token-worker-101')
      expect(res.data.user).toEqual({ id: '101', name: 'Ravi Patil', role: 'worker' })
      expect(JSON.stringify(res.data)).not.toContain('1234')
    }
  })

  it('rejects with 401 on wrong PIN', async () => {
    await expect(
      client.post('/auth/worker/login', { phone: '9876543210', pin: '9999' })
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: { detail: 'Incorrect credentials' }
      }
    })
  })

  it('rejects with 401 on unknown phone number', async () => {
    await expect(
      client.post('/auth/worker/login', { phone: '9111111111', pin: '1234' })
    ).rejects.toMatchObject({
      response: {
        status: 401,
        data: { detail: 'Incorrect credentials' }
      }
    })
  })

  it('rejects with 403 on deactivated worker with correct credentials', async () => {
    await expect(
      client.post('/auth/worker/login', { phone: '9000000000', pin: '1234' })
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { detail: 'Account is deactivated' }
      }
    })
  })
})
