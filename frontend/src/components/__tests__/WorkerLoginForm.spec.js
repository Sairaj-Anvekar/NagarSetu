import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WorkerLoginForm from '../WorkerLoginForm.vue'

vi.mock('../../api/authApi')
import { loginWorker as mockLoginWorker } from '../../api/authApi'

describe('WorkerLoginForm — input sanitization and validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('renders phone and pin input fields with correct attributes', () => {
    const wrapper = mount(WorkerLoginForm)
    const phoneInput = wrapper.find('input#worker-phone')
    const pinInput = wrapper.find('input#worker-pin')

    expect(phoneInput.exists()).toBe(true)
    expect(phoneInput.attributes('type')).toBe('tel')
    expect(phoneInput.attributes('inputmode')).toBe('tel')
    expect(pinInput.exists()).toBe(true)
    expect(pinInput.attributes('type')).toBe('password')
    expect(pinInput.attributes('inputmode')).toBe('numeric')
    expect(pinInput.attributes('maxlength')).toBe('4')
  })

  it('strips letters and symbols from the PIN input, leaving only digits', async () => {
    const wrapper = mount(WorkerLoginForm)
    const pinInput = wrapper.find('input#worker-pin')

    await pinInput.setValue('a1#b2$3c4%')

    expect(pinInput.element.value).toBe('1234')
  })

  it('shows validation error for invalid phone and does not call loginWorker', async () => {
    const wrapper = mount(WorkerLoginForm)
    await wrapper.find('input#worker-phone').setValue('123')
    await wrapper.find('input#worker-pin').setValue('1234')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter a valid phone number.')
    expect(wrapper.find('#worker-phone').classes()).toContain('is-invalid')
    expect(mockLoginWorker).not.toHaveBeenCalled()
  })

  it('shows validation error when PIN is not exactly 4 digits and does not call loginWorker', async () => {
    const wrapper = mount(WorkerLoginForm)
    await wrapper.find('input#worker-phone').setValue('9876543210')
    await wrapper.find('input#worker-pin').setValue('123')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('PIN must be exactly 4 digits.')
    expect(wrapper.find('#worker-pin').classes()).toContain('is-invalid')
    expect(mockLoginWorker).not.toHaveBeenCalled()
  })

  it('shows both validation errors when form is submitted empty and does not call loginWorker', async () => {
    const wrapper = mount(WorkerLoginForm)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter a valid phone number.')
    expect(wrapper.text()).toContain('PIN must be exactly 4 digits.')
    expect(mockLoginWorker).not.toHaveBeenCalled()
  })
})

describe('WorkerLoginForm — submission, loading and error handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('calls loginWorker with cleaned phone and pin on valid submit and emits success', async () => {
    mockLoginWorker.mockResolvedValueOnce({
      token: 'worker-tok',
      role: 'worker',
      user: { id: 2, name: 'Worker' },
    })
    const wrapper = mount(WorkerLoginForm)

    await wrapper.find('#worker-phone').setValue(' +91 98765 43210 ')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockLoginWorker).toHaveBeenCalledWith({
      phone: '+919876543210',
      pin: '1234',
    })
    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('success')).toHaveLength(1)
  })

  it('shows "Incorrect phone number or PIN." on 401 rejection and clears pin field', async () => {
    mockLoginWorker.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    })
    const wrapper = mount(WorkerLoginForm)

    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-pin').setValue('9999')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Login failed')
    expect(wrapper.text()).toContain('Incorrect phone number or PIN.')
    expect(wrapper.find('#worker-pin').element.value).toBe('')
  })

  it('shows not-allowed message on 403 rejection', async () => {
    mockLoginWorker.mockRejectedValueOnce({
      response: { status: 403, data: {} },
    })
    const wrapper = mount(WorkerLoginForm)

    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'This account is not allowed to log in. Please contact your administrator.',
    )
  })

  it('shows generic error message on non-HTTP error', async () => {
    mockLoginWorker.mockRejectedValueOnce(new Error('Network failure'))
    const wrapper = mount(WorkerLoginForm)

    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Something went wrong. Please try again.')
  })

  it('disables button and shows role="status" spinner while pending, and ignores second submit', async () => {
    let resolvePromise
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockLoginWorker.mockReturnValueOnce(pendingPromise)

    const wrapper = mount(WorkerLoginForm)
    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-pin').setValue('1234')

    // First submit starts loading
    await wrapper.find('form').trigger('submit')

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    // Second submit while request is pending is ignored
    await wrapper.find('form').trigger('submit')
    expect(mockLoginWorker).toHaveBeenCalledTimes(1)

    // Resolve the promise
    resolvePromise({ token: 'tok', role: 'worker', user: null })
    await flushPromises()
  })

  it('clears error alert on the next submit attempt', async () => {
    mockLoginWorker.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    })
    const wrapper = mount(WorkerLoginForm)

    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-pin').setValue('0000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Incorrect phone number or PIN.')

    // Next submit with valid credentials clears previous error
    mockLoginWorker.mockResolvedValueOnce({ token: 'tok', role: 'worker', user: null })
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Incorrect phone number or PIN.')
  })
})
