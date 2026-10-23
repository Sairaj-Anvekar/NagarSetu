import { describe, expect, it } from 'vitest'
import { getSafeRedirect } from '../redirect'

describe('getSafeRedirect', () => {
  it('allows safe relative paths', () => {
    expect(getSafeRedirect('/admin')).toBe('/admin')
    expect(getSafeRedirect('/admin?tab=1')).toBe('/admin?tab=1')
  })

  it('rejects protocol-relative and external URLs', () => {
    expect(getSafeRedirect('//evil.com')).toBeNull()
    expect(getSafeRedirect('https://evil.com')).toBeNull()
  })

  it('rejects paths containing backslashes', () => {
    expect(getSafeRedirect('/\\evil.com')).toBeNull()
  })

  it('rejects /login paths to avoid redirect loops', () => {
    expect(getSafeRedirect('/login')).toBeNull()
    expect(getSafeRedirect('/login?x=1')).toBeNull()
  })

  it('rejects empty strings and non-string inputs', () => {
    expect(getSafeRedirect('')).toBeNull()
    expect(getSafeRedirect(undefined)).toBeNull()
    expect(getSafeRedirect(['/admin'])).toBeNull()
    expect(getSafeRedirect(123)).toBeNull()
  })
})
