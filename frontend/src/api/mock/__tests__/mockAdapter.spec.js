import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { createMockAdapter, MockHttpError } from '../mockAdapter'

describe('mockAdapter - route matching and request parsing', () => {
  it('resolves with handler data and status for matching route and strips baseURL', async () => {
    const routes = [
      {
        method: 'GET',
        path: '/items',
        handler: () => ({ status: 200, data: { items: [1, 2] } })
      }
    ]
    const client = axios.create({
      baseURL: 'http://localhost:8000/api/v1',
      adapter: createMockAdapter(routes)
    })

    const res = await client.get('/items')
    expect(res.status).toBe(200)
    expect(res.data).toEqual({ items: [1, 2] })
  })

  it('passes :id path params and query object to handler', async () => {
    let captured = null
    const routes = [
      {
        method: 'GET',
        path: '/workers/:id',
        handler: (req) => {
          captured = req
          return { data: { success: true } }
        }
      }
    ]
    const client = axios.create({ adapter: createMockAdapter(routes) })

    await client.get('/workers/101?active=true&tab=profile')
    expect(captured.params).toEqual({ id: '101' })
    expect(captured.query).toEqual({ active: 'true', tab: 'profile' })
  })

  it('parses JSON body and provides readable Authorization header in handler', async () => {
    let captured = null
    const routes = [
      {
        method: 'POST',
        path: '/login',
        handler: (req) => {
          captured = req
          return { status: 200, data: { ok: true } }
        }
      }
    ]
    const client = axios.create({ adapter: createMockAdapter(routes) })

    await client.post(
      '/login',
      { username: 'admin' },
      {
        headers: { Authorization: 'Bearer token-1' }
      }
    )
    expect(captured.body).toEqual({ username: 'admin' })
    expect(captured.headers.get('Authorization')).toBe('Bearer token-1')
  })
})

describe('mockAdapter - error handling and AxiosError rejections', () => {
  it('rejects with 404 AxiosError when no route matches', async () => {
    const client = axios.create({ adapter: createMockAdapter([]) })
    await expect(client.get('/unknown')).rejects.toMatchObject({
      isAxiosError: true,
      response: {
        status: 404,
        data: { detail: 'Not Found' }
      }
    })
  })

  it('rejects with status and detail when handler throws MockHttpError', async () => {
    const routes = [
      {
        method: 'GET',
        path: '/forbidden',
        handler: () => {
          throw new MockHttpError(403, 'x')
        }
      }
    ]
    const client = axios.create({ adapter: createMockAdapter(routes) })
    await expect(client.get('/forbidden')).rejects.toMatchObject({
      isAxiosError: true,
      response: {
        status: 403,
        data: { detail: 'x' }
      }
    })
  })

  it('rejects with status 500 and Mock server error when handler throws plain Error', async () => {
    const routes = [
      {
        method: 'GET',
        path: '/crash',
        handler: () => {
          throw new Error('Unexpected crash')
        }
      }
    ]
    const client = axios.create({ adapter: createMockAdapter(routes) })
    await expect(client.get('/crash')).rejects.toMatchObject({
      isAxiosError: true,
      response: {
        status: 500,
        data: { detail: 'Mock server error' }
      }
    })
  })
})
