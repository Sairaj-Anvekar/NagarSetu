import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { saveAuth } from '../../utils/authStorage'
import WorkerHistoryView from '../WorkerHistoryView.vue'
import WorkerAccountView from '../WorkerAccountView.vue'
import EmptyState from '../../components/EmptyState.vue'

describe('Worker placeholder pages', () => {
  let pinia
  let router
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/worker/account', component: WorkerAccountView },
        { path: '/login', component: { template: '<p>Login page</p>' } },
      ],
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  it('renders the History heading and empty state in WorkerHistoryView', () => {
    wrapper = mount(WorkerHistoryView)

    expect(wrapper.get('h1').text()).toBe('History')
    expect(wrapper.get('header p').text()).toBe('Complaints you have completed.')

    const emptyState = wrapper.getComponent(EmptyState)
    expect(emptyState.get('h3').text()).toBe('No completed tasks yet')
    expect(emptyState.get('p').text()).toBe('Tasks you complete will be listed here.')
  })

  describe('WorkerAccountView', () => {
    it('shows worker initials, name, field worker role, no phone data, and logs out to /login', async () => {
      saveAuth({
        token: 'test-token',
        role: 'worker',
        user: { id: '101', name: 'Ravi Patil', phone: '+919876543210', role: 'worker' },
      })
      setActivePinia(createPinia())

      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      expect(wrapper.get('h1').text()).toBe('Account')
      expect(wrapper.get('.ns-worker-account__avatar').text()).toBe('RP')
      expect(wrapper.get('.ns-worker-account__name').text()).toBe('Ravi Patil')
      expect(wrapper.get('.ns-worker-account__role').text()).toBe('Field worker')

      // Ensure no phone number or personal identity data is leaked in the DOM
      expect(wrapper.text()).not.toContain('9876543210')
      expect(wrapper.text()).not.toContain('+91')

      // Test logout action
      const logoutBtn = wrapper.get('button.btn-outline-secondary')
      expect(logoutBtn.text()).toBe('Log out')
      await logoutBtn.trigger('click')
      await flushPromises()

      expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('falls back to "Worker" when the user name is missing', async () => {
      saveAuth({
        token: 'test-token',
        role: 'worker',
        user: { id: '101', name: '', role: 'worker' },
      })
      setActivePinia(createPinia())

      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      expect(wrapper.get('.ns-worker-account__name').text()).toBe('Worker')
      expect(wrapper.get('.ns-worker-account__avatar').text()).toBe('W')
    })
  })
})
