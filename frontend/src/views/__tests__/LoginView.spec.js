import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { saveAuth } from '../../utils/authStorage'
import LoginView from '../LoginView.vue'
import AdminLoginForm from '../../components/AdminLoginForm.vue'
import WorkerLoginForm from '../../components/WorkerLoginForm.vue'

vi.mock('../../api/authApi')
import { loginAdmin as mockLoginAdmin, loginWorker as mockLoginWorker } from '../../api/authApi'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/admin', name: 'admin', component: { template: '<div>Admin Page</div>' } },
  { path: '/worker', name: 'worker', component: { template: '<div>Worker Page</div>' } },
]

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('LoginView — tabs and notices', () => {
  let pinia
  let router

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
    vi.resetAllMocks()
    router = createTestRouter()
  })

  it('renders the Admin form by default with the Admin button active', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const buttons = wrapper.findAll('.nav-pills button')
    expect(buttons[0].text()).toBe('Admin')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].text()).toBe('Worker')
    expect(buttons[1].classes()).not.toContain('active')

    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(false)
  })

  it('shows the Worker form and marks Worker active when clicked', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const buttons = wrapper.findAll('.nav-pills button')
    await buttons[1].trigger('click')

    expect(buttons[1].classes()).toContain('active')
    expect(buttons[0].classes()).not.toContain('active')
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
  })

  it('has role="tab" on toggle buttons with aria-selected switching on click', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const buttons = wrapper.findAll('.nav-pills button')
    expect(buttons[0].attributes('role')).toBe('tab')
    expect(buttons[1].attributes('role')).toBe('tab')

    // Admin active by default
    expect(buttons[0].attributes('aria-selected')).toBe('true')
    expect(buttons[1].attributes('aria-selected')).toBe('false')

    // Click Worker
    await buttons[1].trigger('click')
    expect(buttons[0].attributes('aria-selected')).toBe('false')
    expect(buttons[1].attributes('aria-selected')).toBe('true')

    // Click Admin
    await buttons[0].trigger('click')
    expect(buttons[0].attributes('aria-selected')).toBe('true')
    expect(buttons[1].attributes('aria-selected')).toBe('false')
  })

  it('shows expired notice when route query reason is "expired"', async () => {
    router.push('/login?reason=expired')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const notice = wrapper.find('.alert-warning')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Your session has expired. Please log in again.')
  })

  it('does not show expired notice on normal /login', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.find('.alert-warning').exists()).toBe(false)
  })
})

describe('LoginView — login redirects and session state', () => {
  let router

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
    router = createTestRouter()
  })

  it('redirects to /admin after a successful admin login', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    mockLoginAdmin.mockResolvedValueOnce({
      token: 'admin-tok',
      role: 'admin',
      user: { id: 1 },
    })

    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const adminForm = wrapper.findComponent(AdminLoginForm)
    await adminForm.find('#admin-username').setValue('alice')
    await adminForm.find('#admin-password').setValue('secret')
    await adminForm.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects to /worker after a successful worker login', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    mockLoginWorker.mockResolvedValueOnce({
      token: 'worker-tok',
      role: 'worker',
      user: { id: 2 },
    })

    router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    // Switch to Worker tab
    const buttons = wrapper.findAll('.nav-pills button')
    await buttons[1].trigger('click')

    const workerForm = wrapper.findComponent(WorkerLoginForm)
    await workerForm.find('#worker-phone').setValue('9876543210')
    await workerForm.find('#worker-pin').setValue('1234')
    await workerForm.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/worker')
  })

  it('redirects already-authenticated admin to /admin on mount', async () => {
    saveAuth({ token: 'saved-admin-tok', role: 'admin', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)

    router.push('/login')
    await router.isReady()

    mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects already-authenticated worker to /worker on mount', async () => {
    saveAuth({ token: 'saved-worker-tok', role: 'worker', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)

    router.push('/login')
    await router.isReady()

    mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/worker')
  })

  it('redirects to target path after successful admin login with ?redirect query', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    mockLoginAdmin.mockResolvedValueOnce({
      token: 'admin-tok',
      role: 'admin',
      user: { id: 1 },
    })

    router.push('/login?redirect=/admin')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const adminForm = wrapper.findComponent(AdminLoginForm)
    await adminForm.find('#admin-username').setValue('alice')
    await adminForm.find('#admin-password').setValue('secret')
    await adminForm.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('ignores unsafe redirect query like //evil.com and redirects admin to role home', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    mockLoginAdmin.mockResolvedValueOnce({
      token: 'admin-tok',
      role: 'admin',
      user: { id: 1 },
    })

    router.push('/login?redirect=//evil.com')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const adminForm = wrapper.findComponent(AdminLoginForm)
    await adminForm.find('#admin-username').setValue('alice')
    await adminForm.find('#admin-password').setValue('secret')
    await adminForm.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects already-authenticated worker to redirect target on mount', async () => {
    saveAuth({ token: 'saved-worker-tok', role: 'worker', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)

    router.push('/login?redirect=/worker')
    await router.isReady()

    mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/worker')
  })
})

