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

  it('offers officer sign-in content and switches to the existing Worker form', async () => {
    await router.push('/login')
    await router.isReady()
    const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
    expect(wrapper.get('.ns-admin-signin-heading h2').text()).toBe('Officer login')
    expect(wrapper.get('.ns-admin-signin-tag').text()).toBe('Official sign in')
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
    const switchButton = wrapper.get('.ns-admin-worker-switch button')
    expect(switchButton.attributes('type')).toBe('button')
    expect(switchButton.text()).toBe('Field worker? Sign in on your phone')
    await switchButton.trigger('click')
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
    expect(wrapper.find('.ns-admin-portal').exists()).toBe(false)
    expect(wrapper.find('.ns-admin-signin-heading').exists()).toBe(false)
    expect(wrapper.get('#login-heading').text()).toBe("Sign in to see today's tasks")
    expect(wrapper.get('#worker-login-tab').attributes('aria-selected')).toBe('true')
    expect(mockLoginAdmin).not.toHaveBeenCalled()
    expect(mockLoginWorker).not.toHaveBeenCalled()
    wrapper.unmount()
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

  it('keeps the role heading, pill, form and panel label in sync when switching both ways', async () => {
    await router.push('/login')
    await router.isReady()
    const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })

    for (const role of ['admin', 'worker', 'admin']) {
      await wrapper.get(`#${role}-login-tab`).trigger('click')
      const worker = role === 'worker'
      expect(wrapper.get('.ns-login-eyebrow').text()).toBe(worker ? 'FIELD WORKER' : 'ADMIN')
      expect(wrapper.get('#login-heading').text()).toBe(
        worker ? "Sign in to see today's tasks" : 'Sign in to your console',
      )
      expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(worker)
      expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(!worker)
      expect(wrapper.get('#login-panel').attributes('aria-labelledby')).toBe(`${role}-login-tab`)
      expect(wrapper.findAll('[role="tab"][aria-selected="true"]')).toHaveLength(1)
      expect(wrapper.get('[role="tab"][aria-selected="true"]').attributes('id')).toBe(
        `${role}-login-tab`,
      )
    }
    expect(mockLoginAdmin).not.toHaveBeenCalled()
    expect(mockLoginWorker).not.toHaveBeenCalled()
    wrapper.unmount()
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

  it('shows deactivated notice when route query reason is "deactivated"', async () => {
    router.push('/login?reason=deactivated')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const notice = wrapper.find('.alert-warning')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain(
      'Your account has been deactivated. Please contact your administrator.',
    )
    expect(notice.text()).not.toContain('Your session has expired.')
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

  it('opens the Worker tab directly when route has ?role=worker', async () => {
    await router.push('/login?role=worker')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
    expect(wrapper.get('#login-heading').text()).toBe("Sign in to see today's tasks")
    expect(wrapper.get('.ns-login-eyebrow').text()).toBe('FIELD WORKER')
  })

  it('hides the entire tab bar and shows no admin login option when the worker tab is active', async () => {
    await router.push('/login?role=worker')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    // The whole tab bar is hidden so no lone tab or admin option remains
    expect(wrapper.find('.ns-login-tabs').isVisible()).toBe(false)
    expect(wrapper.find('#admin-login-tab').isVisible()).toBe(false)

    // No admin portal heading or officer switch visible
    expect(wrapper.find('.ns-admin-portal').exists()).toBe(false)
    expect(wrapper.find('.ns-admin-signin-heading').exists()).toBe(false)
    expect(wrapper.find('.ns-admin-access-notice').exists()).toBe(false)
    expect(wrapper.find('.ns-admin-worker-switch').exists()).toBe(false)
  })

  it('opens Admin tab when route query has ?role=admin even if worker role is remembered in localStorage', async () => {
    localStorage.setItem('ns_last_role', 'worker')
    await router.push('/login?role=admin')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(false)
  })

  it('renders the admin form for ?redirect=%2Fadmin%2Fcomplaints even when ns_last_role is worker', async () => {
    localStorage.setItem('ns_last_role', 'worker')
    await router.push('/login?redirect=/admin/complaints')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(false)
    expect(wrapper.find('.ns-login-tabs').isVisible()).toBe(true)
  })

  it('opens the Worker tab directly when route has ?role=worker even if admin role is remembered', async () => {
    localStorage.setItem('ns_last_role', 'admin')
    await router.push('/login?role=worker')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
  })

  it('opens Worker tab when worker role is remembered in localStorage and route query has no role', async () => {
    localStorage.setItem('ns_last_role', 'worker')
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
    expect(wrapper.get('#login-heading').text()).toBe("Sign in to see today's tasks")
  })

  it('opens Admin tab when admin role is remembered in localStorage and route query has no role', async () => {
    localStorage.setItem('ns_last_role', 'admin')
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
    expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(false)
  })

  it('opens Worker tab when running in standalone PWA display mode without query role or remembered role', async () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    try {
      await router.push('/login')
      await router.isReady()

      const wrapper = mount(LoginView, {
        global: {
          plugins: [pinia, router],
        },
      })

      expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(true)
      expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(false)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('handles localStorage errors gracefully without crashing and falls back to admin', async () => {
    localStorage.setItem('ns_last_role', 'worker')
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access Denied')
    })

    try {
      await router.push('/login')
      await router.isReady()

      const wrapper = mount(LoginView, {
        global: {
          plugins: [pinia, router],
        },
      })

      expect(wrapper.findComponent(AdminLoginForm).exists()).toBe(true)
      expect(wrapper.findComponent(WorkerLoginForm).exists()).toBe(false)
    } finally {
      getItemSpy.mockRestore()
    }
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

