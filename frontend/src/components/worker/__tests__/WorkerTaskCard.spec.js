import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkerTaskCard from '../WorkerTaskCard.vue'

// Fixed anchor "now" = 2026-11-01T10:00:00.000Z
// baseTask has sla_deadline: 2026-11-05T10:00:00.000Z (4 days in future, not overdue)
const NOW = new Date('2026-11-01T10:00:00.000Z').getTime()

const baseTask = {
  id: 'task-1',
  tracking_code: 'GRV-2026-B2K9',
  category: 'Drainage & Sewage',
  description: 'Overflowing drain causing waterlogging near bus stop.',
  image_url: null,
  latitude: 19.076,
  longitude: 72.8777,
  priority: 'critical',
  status: 'In-Progress',
  sla_deadline: '2026-11-05T10:00:00.000Z',
  is_overdue: false,
}

describe('WorkerTaskCard', () => {
  it('renders tracking code, category, priority badge, and status badge', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, now: NOW },
    })

    expect(wrapper.text()).toContain('GRV-2026-B2K9')
    expect(wrapper.find('h2').text()).toBe('Drainage & Sewage')

    const priorityBadge = wrapper.find('.ns-badge--critical')
    expect(priorityBadge.exists()).toBe(true)
    expect(priorityBadge.text()).toBe('Critical')

    const statusBadge = wrapper.find('.ns-badge--in-progress')
    expect(statusBadge.exists()).toBe(true)
    expect(statusBadge.text()).toBe('In-Progress')
  })

  it('renders the Overdue pill and overdue styling when task is overdue', () => {
    const overdueTask = {
      ...baseTask,
      is_overdue: true,
      sla_deadline: '2026-10-01T10:00:00.000Z',
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: overdueTask, now: NOW },
    })

    const pill = wrapper.find('.worker-task-card__overdue-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toContain('Overdue')
    expect(wrapper.text().toLowerCase()).toContain('overdue')
  })

  it('does not render the Overdue pill when task is not overdue', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, now: NOW },
    })

    expect(wrapper.find('.worker-task-card__overdue-pill').exists()).toBe(false)
  })

  it('renders directions button with encoded Google Maps URL and security attributes', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, now: NOW },
    })

    const link = wrapper.find('a.btn')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Directions')
    expect(link.attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=19.076%2C72.8777',
    )
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('does not render directions button when coordinates are missing or non-numeric', () => {
    const invalidCoordsTask = {
      ...baseTask,
      latitude: null,
      longitude: 'invalid',
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: invalidCoordsTask, now: NOW },
    })

    expect(wrapper.find('a.btn').exists()).toBe(false)
  })

  it('never displays raw coordinates as text and contains no img element', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, now: NOW },
    })

    expect(wrapper.text()).not.toContain('19.076')
    expect(wrapper.text()).not.toContain('72.8777')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  async function mountWithRouter(task = baseTask) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/worker', component: { template: '<div>Queue</div>' } },
        { path: '/worker/tasks/:id', component: { template: '<div>Detail</div>' } },
      ],
    })
    await router.push('/worker')
    await router.isReady()

    const wrapper = mount(WorkerTaskCard, {
      props: { task, now: NOW },
      global: { plugins: [router] },
    })
    return { wrapper, router }
  }

  it('links the card to /worker/tasks/<id> with an accessible name', async () => {
    const { wrapper, router } = await mountWithRouter()

    const detailLink = wrapper.get('a.stretched-link')
    expect(detailLink.attributes('href')).toBe('/worker/tasks/task-1')
    expect(detailLink.attributes('aria-label')).toContain('GRV-2026-B2K9')
    expect(detailLink.attributes('aria-label')).toContain('Drainage & Sewage')

    await detailLink.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/worker/tasks/task-1')
  })

  it('keeps Directions independently clickable without navigating to task detail', async () => {
    const { wrapper, router } = await mountWithRouter()

    const directionsLink = wrapper.get('a.btn')
    expect(directionsLink.classes()).toContain('worker-task-card__directions-btn')
    expect(directionsLink.classes()).not.toContain('stretched-link')

    await directionsLink.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/worker')
  })

  it('renders Open task button and it is not an a.btn', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, now: NOW },
    })

    const openBtn = wrapper.find('.worker-task-card__open-btn')
    expect(openBtn.exists()).toBe(true)
    expect(openBtn.text()).toBe('Open task')
    expect(openBtn.element.tagName).not.toBe('A')
  })

  it('renders zone chip when zone prop is provided', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, zone: 'Zone A', now: NOW },
    })

    const zoneChip = wrapper.find('.worker-task-card__zone-chip')
    expect(zoneChip.exists()).toBe(true)
    expect(zoneChip.text()).toBe('Zone A')
    expect(wrapper.text()).not.toContain('[object Object]')
    expect(wrapper.text()).not.toContain('{')
  })

  it('renders zone chip when zone prop is an object from real backend', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, zone: { id: '1', name: 'Zone A' }, now: NOW },
    })

    const zoneChip = wrapper.find('.worker-task-card__zone-chip')
    expect(zoneChip.exists()).toBe(true)
    expect(zoneChip.text()).toBe('Zone A')
    expect(wrapper.text()).not.toContain('[object Object]')
    expect(wrapper.text()).not.toContain('{')
  })

  it('renders zone chip when task.zone is an object from real backend and zone prop is omitted', () => {
    const taskWithObjectZone = {
      ...baseTask,
      zone: { id: '1', name: 'Zone A' },
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: taskWithObjectZone, now: NOW },
    })

    const zoneChip = wrapper.find('.worker-task-card__zone-chip')
    expect(zoneChip.exists()).toBe(true)
    expect(zoneChip.text()).toBe('Zone A')
    expect(wrapper.text()).not.toContain('[object Object]')
    expect(wrapper.text()).not.toContain('{')
  })

  it('omits zone chip when zone prop is empty', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask, zone: '', now: NOW },
    })

    expect(wrapper.find('.worker-task-card__zone-chip').exists()).toBe(false)
  })

  it('never renders citizen personal info even if present on the task object', () => {
    const taskWithPii = {
      ...baseTask,
      citizen_name: 'Asha Kulkarni',
      citizen_phone: '+919988776655',
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: taskWithPii, now: NOW },
    })

    expect(wrapper.text()).not.toContain('Asha Kulkarni')
    expect(wrapper.text()).not.toContain('+919988776655')
    expect(wrapper.text()).not.toContain('19.076')
    expect(wrapper.text()).not.toContain('72.8777')
  })
})
