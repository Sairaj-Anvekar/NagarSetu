import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminLoginForm from '../AdminLoginForm.vue'

vi.mock('../../api/authApi')
import { loginAdmin as mockLoginAdmin } from '../../api/authApi'

describe('AdminLoginForm — validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('renders the form with username and password fields', () => {
    const wrapper = mount(AdminLoginForm)
    expect(wrapper.find('input#admin-username').exists()).toBe(true)
    expect(wrapper.find('input#admin-password').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows validation errors when submitted empty and does not call loginAdmin', async () => {
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Username is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(wrapper.find('#admin-username').classes()).toContain('is-invalid')
    expect(wrapper.find('#admin-password').classes()).toContain('is-invalid')
    expect(mockLoginAdmin).not.toHaveBeenCalled()
  })

  it('validates individually when only username is missing', async () => {
    const wrapper = mount(AdminLoginForm)
    await wrapper.find('#admin-password').setValue('secret123')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Username is required.')
    expect(wrapper.text()).not.toContain('Password is required.')
    expect(mockLoginAdmin).not.toHaveBeenCalled()
  })

  it('validates when username is only whitespace', async () => {
    const wrapper = mount(AdminLoginForm)
    await wrapper.find('#admin-username').setValue('   ')
    await wrapper.find('#admin-password').setValue('secret123')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Username is required.')
    expect(mockLoginAdmin).not.toHaveBeenCalled()
  })
})

describe('AdminLoginForm — submission, loading and error handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('calls loginAdmin with trimmed username and password on valid submit and emits success', async () => {
    mockLoginAdmin.mockResolvedValueOnce({
      token: 'test-tok',
      role: 'admin',
      user: { id: 1, name: 'Admin' },
    })
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('#admin-username').setValue('  admin_user  ')
    await wrapper.find('#admin-password').setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockLoginAdmin).toHaveBeenCalledWith({
      username: 'admin_user',
      password: 'secret123',
    })
    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('success')).toHaveLength(1)
  })

  it('shows "Incorrect username or password." on 401 rejection and clears password field', async () => {
    mockLoginAdmin.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    })
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('#admin-username').setValue('admin')
    await wrapper.find('#admin-password').setValue('wrongpassword')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Login failed')
    expect(wrapper.text()).toContain('Incorrect username or password.')
    expect(wrapper.find('#admin-password').element.value).toBe('')
  })

  it('shows not-allowed message on 403 rejection', async () => {
    mockLoginAdmin.mockRejectedValueOnce({
      response: { status: 403, data: {} },
    })
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('#admin-username').setValue('admin')
    await wrapper.find('#admin-password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'This account is not allowed to log in. Please contact your administrator.',
    )
  })

  it('shows generic error message on non-HTTP error', async () => {
    mockLoginAdmin.mockRejectedValueOnce(new Error('Network failure'))
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('#admin-username').setValue('admin')
    await wrapper.find('#admin-password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Something went wrong. Please try again.')
  })

  it('disables button and shows role="status" spinner while pending, and ignores second submit', async () => {
    let resolvePromise
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockLoginAdmin.mockReturnValueOnce(pendingPromise)

    const wrapper = mount(AdminLoginForm)
    await wrapper.find('#admin-username').setValue('admin')
    await wrapper.find('#admin-password').setValue('secret')

    // First submit starts loading
    await wrapper.find('form').trigger('submit')

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    // Second click while request is pending is ignored
    await wrapper.find('form').trigger('submit')
    expect(mockLoginAdmin).toHaveBeenCalledTimes(1)

    // Resolve the promise
    resolvePromise({ token: 'tok', role: 'admin', user: null })
    await flushPromises()
  })

  it('clears error alert on the next submit attempt', async () => {
    mockLoginAdmin.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    })
    const wrapper = mount(AdminLoginForm)

    await wrapper.find('#admin-username').setValue('admin')
    await wrapper.find('#admin-password').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Incorrect username or password.')

    // Next submit with valid credentials clears previous error
    mockLoginAdmin.mockResolvedValueOnce({ token: 'tok', role: 'admin', user: null })
    await wrapper.find('#admin-password').setValue('correct')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Incorrect username or password.')
  })
})
