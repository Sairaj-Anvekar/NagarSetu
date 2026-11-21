import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkerTabBar from '../WorkerTabBar.vue'
import AppIcon from '../../AppIcon.vue'

const StubView = { template: '<div />' }

async function mountTabBar(initialPath) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worker', name: 'worker', component: StubView },
      { path: '/worker/tasks/:id', name: 'worker-task-detail', component: StubView },
      { path: '/worker/history', name: 'worker-history', component: StubView },
      { path: '/worker/account', name: 'worker-account', component: StubView },
    ],
  })
  await router.push(initialPath)
  await router.isReady()

  const wrapper = mount(WorkerTabBar, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('WorkerTabBar', () => {
  it('keeps one active icon pill as all three tab links are followed', async () => {
    const { wrapper, router } = await mountTabBar('/worker')
    const tabs = [
      { path: '/worker', label: 'Tasks', icon: 'tasks' },
      { path: '/worker/history', label: 'History', icon: 'clock' },
      { path: '/worker/account', label: 'Account', icon: 'user' },
    ]
    expect(wrapper.findAll('a')).toHaveLength(3)
    for (const tab of tabs) {
      const link = wrapper.get(`a[href="${tab.path}"]`)
      expect(link.get('.ns-worker-tab-bar__label').text()).toBe(tab.label)
      const pill = link.get('.ns-worker-tab-bar__pill')
      expect(pill.getComponent(AppIcon).props()).toMatchObject({ name: tab.icon, size: 22 })
      expect(pill.get('svg').attributes('aria-hidden')).toBe('true')
      await link.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(tab.path)
      expect(wrapper.findAll('a[aria-current="page"]')).toHaveLength(1)
      expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe(tab.path)
      expect(wrapper.findAll('a[aria-current="page"] .ns-worker-tab-bar__pill')).toHaveLength(1)
    }
    wrapper.unmount()
  })

  it.each(['/worker', '/worker/tasks/abc'])(
    'marks only the Tasks tab with aria-current="page" on %s',
    async (path) => {
      const { wrapper } = await mountTabBar(path)

      expect(wrapper.get('a[href="/worker"]').attributes('aria-current')).toBe('page')
      expect(wrapper.get('a[href="/worker/history"]').attributes('aria-current')).toBeUndefined()
      expect(wrapper.get('a[href="/worker/account"]').attributes('aria-current')).toBeUndefined()
    },
  )

  it('navigates back to /worker when Tasks is clicked from /worker/tasks/abc', async () => {
    const { wrapper, router } = await mountTabBar('/worker/tasks/abc')

    await wrapper.get('a[href="/worker"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/worker')
  })

  it('does not mark Tasks active on /worker/history', async () => {
    const { wrapper } = await mountTabBar('/worker/history')

    expect(wrapper.get('a[href="/worker"]').attributes('aria-current')).toBeUndefined()
    expect(wrapper.get('a[href="/worker/history"]').attributes('aria-current')).toBe('page')
  })
})

