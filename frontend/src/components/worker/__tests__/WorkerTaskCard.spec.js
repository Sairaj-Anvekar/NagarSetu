import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
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
})
