import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkerTabBar from '../WorkerTabBar.vue'

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

