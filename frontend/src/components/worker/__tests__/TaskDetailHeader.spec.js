import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import TaskDetailHeader from '../TaskDetailHeader.vue'

async function mountHeader(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worker', name: 'worker', component: { template: '<div>Queue</div>' } },
      { path: '/worker/tasks/:id', name: 'worker-task-detail', component: { template: '<div>Detail</div>' } },
    ],
  })
  await router.push('/worker/tasks/task-1')
  await router.isReady()

  return mount(TaskDetailHeader, {
    props: { trackingCode: 'GRV-2026-A7X3', ...props },
    global: { plugins: [router] },
  })
}

describe('TaskDetailHeader', () => {
  it('renders a 44px back button with aria-label="Back to tasks" navigating to /worker', async () => {
    const wrapper = await mountHeader()
    const backBtn = wrapper.get('a.ns-task-detail-header__back')

    expect(backBtn.attributes('aria-label')).toBe('Back to tasks')
    expect(backBtn.attributes('href')).toBe('/worker')
    expect(backBtn.find('svg').exists()).toBe(true)
  })

  it('renders the tracking code inside an h1', async () => {
    const wrapper = await mountHeader({ trackingCode: 'GRV-2026-X999' })
    expect(wrapper.get('h1').text()).toBe('GRV-2026-X999')
  })

  it.each([
    ['high', 'High priority', 'rgb(255, 237, 213)', 'rgb(154, 52, 18)'],
    ['critical', 'Critical priority', 'rgb(255, 237, 213)', 'rgb(154, 52, 18)'],
    ['medium', 'Medium priority', 'rgb(254, 243, 199)', 'rgb(146, 64, 14)'],
    ['low', 'Low priority', 'rgb(224, 238, 255)', 'rgb(29, 78, 216)'],
  ])('renders the correct chip for %s priority', async (priority, label, expectedBg, expectedFg) => {
    const wrapper = await mountHeader({ priority })
    const chip = wrapper.get('.ns-task-detail-header__priority-chip')

    expect(chip.text()).toContain(label)
    expect(chip.attributes('style')).toContain(`background-color: ${expectedBg}`)
    expect(chip.attributes('style')).toContain(`color: ${expectedFg}`)
  })

  it('renders category and zone joined by a dot when zone is provided', async () => {
    const wrapper = await mountHeader({
      category: 'Solid Waste Management',
      zone: 'Zone A',
    })

    const meta = wrapper.get('.ns-task-detail-header__meta')
    expect(meta.text()).toBe('Solid Waste Management · Zone A')
    expect(meta.text()).not.toContain('[object Object]')
    expect(meta.text()).not.toContain('{')
  })

  it('renders category and zone joined by a dot when zone is an object from real backend', async () => {
    const wrapper = await mountHeader({
      category: 'Solid Waste Management',
      zone: { id: '1', name: 'Zone A' },
    })

    const meta = wrapper.get('.ns-task-detail-header__meta')
    expect(meta.text()).toBe('Solid Waste Management · Zone A')
    expect(meta.text()).not.toContain('[object Object]')
    expect(meta.text()).not.toContain('{')
  })

  it('omits the zone entirely when not provided', async () => {
    const wrapper = await mountHeader({
      category: 'Waterlogging & Drainage',
      zone: '',
    })

    const meta = wrapper.get('.ns-task-detail-header__meta')
    expect(meta.text()).toBe('Waterlogging & Drainage')
    expect(meta.text()).not.toContain('·')
  })
})
