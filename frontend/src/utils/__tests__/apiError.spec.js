import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../apiError'

// Helper: build a minimal Axios-like error with a response
function makeResponseError(status, data = {}) {
  return { response: { status, data } }
}

// Helper: build a network error (no response property).
// Real Axios network/timeout errors always have error.request set
// (the XMLHttpRequest that was fired but never got a reply).
function makeNetworkError() {
  return { request: {}, message: 'Network Error' }
}

describe('getErrorMessage', () => {
  // a — detail is a non-empty string
  it('returns the detail string when error.response.data.detail is a string', () => {
    const error = makeResponseError(400, { detail: 'Grievance not found.' })
    expect(getErrorMessage(error)).toBe('Grievance not found.')
  })

  // b — detail is an array of { msg } objects
  it('joins msg values when detail is an array', () => {
    const error = makeResponseError(422, {
      detail: [
        { msg: 'Field required', loc: ['body', 'title'] },
        { msg: 'Value too short', loc: ['body', 'description'] },
      ],
    })
    expect(getErrorMessage(error)).toBe('Field required, Value too short')
  })

  it('skips array items that have no msg field', () => {
    const error = makeResponseError(422, {
      detail: [{ loc: ['body', 'title'] }, { msg: 'Value too short' }],
    })
    expect(getErrorMessage(error)).toBe('Value too short')
  })

  // c — known HTTP status codes (no usable detail)
  it('returns session-expired message for 401', () => {
    const error = makeResponseError(401, {})
    expect(getErrorMessage(error)).toBe('Your session has expired. Please log in again.')
  })

  it('returns permission-denied message for 403', () => {
    const error = makeResponseError(403, {})
    expect(getErrorMessage(error)).toBe('You do not have permission to do this.')
  })

  it('returns not-found message for 404', () => {
    const error = makeResponseError(404, {})
    expect(getErrorMessage(error)).toBe('The requested item was not found.')
  })

  it('returns rate-limit message for 429', () => {
    const error = makeResponseError(429, {})
    expect(getErrorMessage(error)).toBe('Too many requests. Please wait a moment and try again.')
  })

  it('returns server-error message for 500', () => {
    const error = makeResponseError(500, {})
    expect(getErrorMessage(error)).toBe('Server error. Please try again later.')
  })

  it('returns server-error message for any status >= 500 (e.g. 503)', () => {
    const error = makeResponseError(503, {})
    expect(getErrorMessage(error)).toBe('Server error. Please try again later.')
  })

  // d — no response (network / timeout)
  it('returns cannot-reach-server message when there is no response', () => {
    expect(getErrorMessage(makeNetworkError())).toBe(
      'Cannot reach the server. Check your connection.',
    )
  })

  // e — unknown / undefined input
  it('returns the default fallback when error is undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Something went wrong. Please try again.')
  })

  it('returns the default fallback when error is null', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.')
  })

  it('returns the default fallback for an unrecognised error shape', () => {
    expect(getErrorMessage({ code: 'UNKNOWN' })).toBe('Something went wrong. Please try again.')
  })

  // custom fallback
  it('respects a custom fallback string', () => {
    expect(getErrorMessage(undefined, 'Custom fallback message.')).toBe('Custom fallback message.')
  })
})
