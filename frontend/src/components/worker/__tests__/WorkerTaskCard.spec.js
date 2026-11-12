import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppIcon from '../../AppIcon.vue'
import WorkerTaskCard from '../WorkerTaskCard.vue'

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
  it('renders tracking code, category, description, priority badge, and status badge', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask },
    })

    expect(wrapper.text()).toContain('GRV-2026-B2K9')
    expect(wrapper.find('h2').text()).toBe('Drainage & Sewage')
    expect(wrapper.text()).toContain('Overflowing drain causing waterlogging near bus stop.')

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
      props: { task: overdueTask },
    })

    const pill = wrapper.find('.worker-task-card__overdue-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toBe('Overdue')
    expect(wrapper.text().toLowerCase()).toContain('overdue')
  })

  it('does not render the Overdue pill when task is not overdue', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask },
    })

    expect(wrapper.find('.worker-task-card__overdue-pill').exists()).toBe(false)
  })

  it('renders directions button with encoded Google Maps URL and security attributes', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask },
    })

    const link = wrapper.find('a.btn')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('Get directions')
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
      props: { task: invalidCoordsTask },
    })

    expect(wrapper.find('a.btn').exists()).toBe(false)
  })

  it('never displays raw coordinates as text and contains no img element', () => {
    const wrapper = mount(WorkerTaskCard, {
      props: { task: baseTask },
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
      props: { task },
      global: { plugins: [router] },
    })
    return { wrapper, router }
  }

  it('links the card to /worker/tasks/<id> with an accessible name and chevron-right icon', async () => {
    const { wrapper, router } = await mountWithRouter()

    const detailLink = wrapper.get('a.stretched-link')
    expect(detailLink.attributes('href')).toBe('/worker/tasks/task-1')
    expect(detailLink.attributes('aria-label')).toContain('GRV-2026-B2K9')
    expect(detailLink.attributes('aria-label')).toContain('Drainage & Sewage')

    const chevron = wrapper
      .findAllComponents(AppIcon)
      .find((icon) => icon.props('name') === 'chevron-right')
    expect(chevron).toBeDefined()

    await detailLink.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/worker/tasks/task-1')
  })

  it('keeps Get directions independently clickable without navigating to task detail', async () => {
    const { wrapper, router } = await mountWithRouter()

    const directionsLink = wrapper.get('a.btn')
    expect(directionsLink.classes()).toContain('worker-task-card__directions-btn')
    expect(directionsLink.classes()).not.toContain('stretched-link')

    await directionsLink.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/worker')
  })

  it('renders photo thumbnail with alt text and falls back to placeholder on image error', async () => {
    const taskWithPhoto = {
      ...baseTask,
      image_url: 'https://example.com/signed-photo.jpg',
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: taskWithPhoto },
    })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://example.com/signed-photo.jpg')
    expect(img.attributes('alt')).toContain('Drainage & Sewage')
    expect(wrapper.find('.worker-task-card__thumb-placeholder').exists()).toBe(false)

    await img.trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.worker-task-card__thumb-placeholder').exists()).toBe(true)
  })

  it('never renders citizen personal info even if present on the task object', () => {
    const taskWithPii = {
      ...baseTask,
      citizen_name: 'Asha Kulkarni',
      citizen_phone: '+919988776655',
    }
    const wrapper = mount(WorkerTaskCard, {
      props: { task: taskWithPii },
    })

    expect(wrapper.text()).not.toContain('Asha Kulkarni')
    expect(wrapper.text()).not.toContain('+919988776655')
    expect(wrapper.text()).not.toContain('19.076')
    expect(wrapper.text()).not.toContain('72.8777')
  })
})
