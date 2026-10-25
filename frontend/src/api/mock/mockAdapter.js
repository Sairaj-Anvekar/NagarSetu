import { AxiosError } from 'axios'

export class MockHttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Mock HTTP error')
    this.name = 'MockHttpError'
    this.status = status
    this.detail = detail
  }
}

export function extractPathAndQuery(url = '', baseURL = '') {
  let cleanUrl = url
  if (baseURL && cleanUrl.startsWith(baseURL)) {
    cleanUrl = cleanUrl.slice(baseURL.length)
  } else if (baseURL) {
    const trimmedBase = baseURL.replace(/\/+$/, '')
    if (cleanUrl.startsWith(trimmedBase)) {
      cleanUrl = cleanUrl.slice(trimmedBase.length)
    }
  }

  if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('?')) {
    cleanUrl = `/${cleanUrl}`
  }

  const [pathname, queryString] = cleanUrl.split('?')
  return {
    pathname: pathname || '/',
    queryString: queryString || ''
  }
}

export function parseQuery(queryString) {
  const query = {}
  if (!queryString) {
    return query
  }
  const searchParams = new URLSearchParams(queryString)
  for (const [key, value] of searchParams.entries()) {
    query[key] = value
  }
  return query
}

export function parseBody(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

export function matchRoute(routes = [], method = '', pathname = '') {
  const targetMethod = method.toUpperCase()
  const reqSegments = pathname.split('/').filter(Boolean)

  for (const route of routes) {
    if (route.method.toUpperCase() !== targetMethod) {
      continue
    }

    const routeSegments = route.path.split('/').filter(Boolean)
    if (routeSegments.length !== reqSegments.length) {
      continue
    }

    let isMatch = true
    const params = {}

    for (let i = 0; i < routeSegments.length; i++) {
      const rSeg = routeSegments[i]
      const reqSeg = reqSegments[i]

      if (rSeg.startsWith(':')) {
        params[rSeg.slice(1)] = reqSeg
      } else if (rSeg !== reqSeg) {
        isMatch = false
        break
      }
    }

    if (isMatch) {
      return { route, params }
    }
  }

  return null
}

const STATUS_TEXTS = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error'
}

export function createMockAdapter(routes = [], { delayMs = 0 } = {}) {
  return async function mockAdapter(config) {
    const { pathname, queryString } = extractPathAndQuery(config.url, config.baseURL)
    const query = parseQuery(queryString)
    const body = parseBody(config.data)
    const matched = matchRoute(routes, config.method || 'GET', pathname)

    let status
    let data

    if (!matched) {
      status = 404
      data = { detail: 'Not Found' }
    } else {
      try {
        const result = await matched.route.handler({
          body,
          params: matched.params,
          query,
          headers: config.headers,
          config
        })
        status = result && typeof result.status === 'number' ? result.status : 200
        data = result && result.data !== undefined ? result.data : null
      } catch (err) {
        if (err instanceof MockHttpError) {
          status = err.status
          data = { detail: err.detail }
        } else {
          status = 500
          data = { detail: 'Mock server error' }
        }
      }
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const statusText = STATUS_TEXTS[status] || (status < 400 ? 'OK' : 'Error')
    const response = {
      data,
      status,
      statusText,
      headers: {},
      config,
      request: {}
    }

    if (status < 400) {
      return response
    }

    const message = `Request failed with status code ${status}`
    const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST

    throw new AxiosError(message, code, config, null, response)
  }
}
