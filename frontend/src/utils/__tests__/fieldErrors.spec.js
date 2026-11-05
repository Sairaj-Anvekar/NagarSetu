import { describe, expect, it } from 'vitest'
import { getFieldErrors } from '../fieldErrors'

describe('getFieldErrors', () => {
  it('maps a 422-shaped detail array to a field-to-message object using the last loc element', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'name'], msg: 'Name must be at least 2 characters' },
            { loc: ['body', 'phone'], msg: 'Enter a valid phone number' },
            { loc: ['body', 'nested', 'zone_id'], msg: 'Choose a zone' },
          ],
        },
      },
    }

    expect(getFieldErrors(error)).toEqual({
      name: 'Name must be at least 2 characters',
      phone: 'Enter a valid phone number',
      zone_id: 'Choose a zone',
    })
  })

  it('preserves the first message when multiple errors target the same field', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'pin'], msg: 'PIN must be exactly 4 digits' },
            { loc: ['body', 'pin'], msg: 'PIN must contain numbers only' },
          ],
        },
      },
    }

    expect(getFieldErrors(error)).toEqual({
      pin: 'PIN must be exactly 4 digits',
    })
  })

  it('skips items without a usable loc or msg', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            null,
            undefined,
            'not-an-object',
            { msg: 'Missing loc' },
            { loc: [], msg: 'Empty loc array' },
            { loc: ['body', 'name'] },
            { loc: ['body', 'name'], msg: '' },
            { loc: ['body', 123], msg: 'Numeric last loc' },
            { loc: ['body', 'phone'], msg: 'Valid message' },
          ],
        },
      },
    }

    expect(getFieldErrors(error)).toEqual({
      phone: 'Valid message',
    })
  })

  it('returns an empty object when detail is a string', () => {
    const error = {
      response: {
        status: 400,
        data: {
          detail: 'Grievance not found',
        },
      },
    }

    expect(getFieldErrors(error)).toEqual({})
  })

  it('returns an empty object when response is missing', () => {
    const networkError = {
      request: {},
      message: 'Network Error',
    }

    expect(getFieldErrors(networkError)).toEqual({})
  })

  it('returns an empty object when error is null or undefined', () => {
    expect(getFieldErrors(null)).toEqual({})
    expect(getFieldErrors(undefined)).toEqual({})
  })

  it('returns an empty object when data or detail is missing', () => {
    expect(getFieldErrors({})).toEqual({})
    expect(getFieldErrors({ response: {} })).toEqual({})
    expect(getFieldErrors({ response: { data: {} } })).toEqual({})
  })
})

