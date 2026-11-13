import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from '../registerServiceWorker'

describe('registerServiceWorker', () => {
  const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker'
  )

  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor)
    } else {
      delete navigator.serviceWorker
    }
  })

  it('does nothing and resolves null when import.meta.env.PROD is false', async () => {
    vi.stubEnv('PROD', false)
    const registerSpy = vi.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy },
      configurable: true,
      writable: true,
    })

    const result = await registerServiceWorker()

    expect(result).toBeNull()
    expect(registerSpy).not.toHaveBeenCalled()
  })

  it('calls register once with "/sw.js" after the load event when PROD is true', async () => {
    vi.stubEnv('PROD', true)
    const mockRegistration = { scope: '/' }
    const registerSpy = vi.fn().mockResolvedValue(mockRegistration)
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy },
      configurable: true,
      writable: true,
    })

    const registrationPromise = registerServiceWorker()

    expect(registerSpy).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('load'))

    const result = await registrationPromise

    expect(registerSpy).toHaveBeenCalledTimes(1)
    expect(registerSpy).toHaveBeenCalledWith('/sw.js')
    expect(result).toBe(mockRegistration)
  })

  it('does not throw and resolves null when register rejects', async () => {
    vi.stubEnv('PROD', true)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registerSpy = vi.fn().mockRejectedValue(new Error('Registration failed'))
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerSpy },
      configurable: true,
      writable: true,
    })

    const registrationPromise = registerServiceWorker()
    window.dispatchEvent(new Event('load'))

    const result = await registrationPromise

    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      'Service worker registration failed:',
      expect.any(Error)
    )
  })

  it('resolves null when serviceWorker is not in navigator', async () => {
    vi.stubEnv('PROD', true)
    delete navigator.serviceWorker

    const result = await registerServiceWorker()

    expect(result).toBeNull()
  })
})

