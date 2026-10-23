import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { saveAuth } from '../../utils/authStorage'
import AppNavbar from '../AppNavbar.vue'

const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/login', component: { template: '<div>Login</div>' } },
  { path: '/admin', component: { template: '<div>Admin</div>' } },
  { path: '/worker', component: { template: '<div>Worker</div>' } },
]

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('AppNavbar — navigation link display', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows Login and hides Admin, Worker, and Logout when logged out', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(AppNavbar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('Login')
    expect(wrapper.text()).not.toContain('Admin')
    expect(wrapper.text()).not.toContain('Worker')
    expect(wrapper.find('button.btn-outline-light').exists()).toBe(false)
  })

  it('shows Admin and Logout, but hides Login and Worker for admin session', async () => {
    saveAuth({ token: 't', role: 'admin', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/admin')
    await router.isReady()

    const wrapper = mount(AppNavbar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('Logout')
    expect(wrapper.text()).not.toContain('Login')
    expect(wrapper.text()).not.toContain('Worker')
    expect(wrapper.find('button.btn-outline-light').exists()).toBe(true)
  })

  it('shows Worker and Logout, but hides Login and Admin for worker session', async () => {
    saveAuth({ token: 't', role: 'worker', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/worker')
    await router.isReady()

    const wrapper = mount(AppNavbar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('Worker')
    expect(wrapper.text()).toContain('Logout')
    expect(wrapper.text()).not.toContain('Login')
    expect(wrapper.text()).not.toContain('Admin')
    expect(wrapper.find('button.btn-outline-light').exists()).toBe(true)
  })

  it('clears stored session and redirects to /login when clicking Logout', async () => {
    saveAuth({ token: 't', role: 'admin', user: null })
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/admin')
    await router.isReady()

    const wrapper = mount(AppNavbar, {
      global: {
        plugins: [pinia, router],
      },
    })

    const logoutBtn = wrapper.find('button.btn-outline-light')
    expect(logoutBtn.exists()).toBe(true)
    await logoutBtn.trigger('click')
    await flushPromises()

    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
