import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { saveAuth } from '../../utils/authStorage'
import { fetchMyHistory } from '../../api/workerApi'
import WorkerHistoryView from '../WorkerHistoryView.vue'
import WorkerAccountView from '../WorkerAccountView.vue'
import EmptyState from '../../components/EmptyState.vue'

const mockPromptState = {
  canInstall: ref(false),
  isInstalled: ref(false),
  isIos: ref(false),
  install: vi.fn(),
}

vi.mock('../../composables/useInstallPrompt', () => ({
  useInstallPrompt: () => mockPromptState,
}))

vi.mock('../../api/workerApi', () => ({
  fetchMyHistory: vi.fn(),
}))

describe('Worker placeholder pages', () => {
  let pinia
  let router
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    mockPromptState.canInstall.value = false
    mockPromptState.isInstalled.value = false
    mockPromptState.isIos.value = false
    mockPromptState.install.mockClear()
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

  it('renders the History heading and empty state in WorkerHistoryView', async () => {
    fetchMyHistory.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 })
    wrapper = mount(WorkerHistoryView)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('History')
    expect(wrapper.get('header p').text()).toBe('0 completed tasks')

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

    it('shows the "Install app" button when canInstall is true and clicking it calls install', async () => {
      mockPromptState.canInstall.value = true
      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      const installBtn = wrapper.get('.ns-worker-account__install-btn')
      expect(installBtn.text()).toBe('Install app')

      await installBtn.trigger('click')
      expect(mockPromptState.install).toHaveBeenCalledTimes(1)
    })

    it('shows "App installed" when isInstalled is true', async () => {
      mockPromptState.isInstalled.value = true
      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      expect(wrapper.get('.ns-worker-account__installed-text').text()).toBe('App installed')
      expect(wrapper.find('.ns-worker-account__install-btn').exists()).toBe(false)
    })

    it('shows the iPhone hint only when isIos is true and not installed', async () => {
      mockPromptState.isIos.value = true
      mockPromptState.isInstalled.value = false
      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      expect(wrapper.get('.ns-worker-account__ios-hint').text()).toBe(
        'On iPhone: tap Share, then Add to Home Screen.'
      )
      expect(wrapper.find('.ns-worker-account__install-btn').exists()).toBe(false)
    })

    it('shows nothing of the install section when canInstall, isInstalled, and isIos are false', async () => {
      mockPromptState.canInstall.value = false
      mockPromptState.isInstalled.value = false
      mockPromptState.isIos.value = false
      await router.push('/worker/account')
      await router.isReady()
      wrapper = mount(WorkerAccountView, { global: { plugins: [router] } })

      expect(wrapper.find('.ns-worker-account__install').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Install this app')
    })
  })
})

