import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DeadlineCell from '../DeadlineCell.vue'

describe('DeadlineCell', () => {
  const fixedNow = new Date('2026-11-23T12:00:00Z').getTime()

  it('renders overdue pill and exact date for an overdue task', () => {
    const row = {
      status: 'Submitted',
      sla_deadline: '2026-11-21T12:00:00Z', // 2 days in the past
      is_overdue: true,
    }

    const wrapper = mount(DeadlineCell, {
      props: { row, now: fixedNow },
    })

    const pill = wrapper.find('.deadline-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.classes()).toContain('deadline-pill--overdue')
    expect(pill.classes()).toContain('ns-overdue-flag')
    expect(pill.text()).toContain('Overdue 2 days')

    const exact = wrapper.find('.deadline-exact')
    expect(exact.exists()).toBe(true)
    expect(exact.text()).not.toBe('—')
  })

  it('renders "Due in X h" pill for a task with upcoming deadline', () => {
    const row = {
      status: 'In-Progress',
      sla_deadline: '2026-11-23T18:00:00Z', // 6 hours in the future
      is_overdue: false,
    }

    const wrapper = mount(DeadlineCell, {
      props: { row, now: fixedNow },
    })

    const pill = wrapper.find('.deadline-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.classes()).toContain('deadline-pill--due')
    expect(pill.text()).toContain('Due in 6 h')
  })

  it('renders "Completed <date>" pill when completed complaint has completion time', () => {
    const row = {
      status: 'Completed',
      resolved_at: '2026-11-21T10:00:00Z',
      sla_deadline: '2026-11-20T10:00:00Z',
    }

    const wrapper = mount(DeadlineCell, {
      props: { row, now: fixedNow },
    })

    const pill = wrapper.find('.deadline-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.classes()).toContain('deadline-pill--completed')
    expect(pill.text()).toContain('Completed 21 Nov')
  })

  it('omits the pill when completed complaint has no completion time', () => {
    const row = {
      status: 'Completed',
      sla_deadline: '2026-11-20T10:00:00Z',
    }

    const wrapper = mount(DeadlineCell, {
      props: { row, now: fixedNow },
    })

    expect(wrapper.find('.deadline-pill').exists()).toBe(false)
    expect(wrapper.find('.deadline-exact').text()).not.toBe('—')
  })

  it('falls back to created_at when sla_deadline is missing', () => {
    const row = {
      status: 'Submitted',
      created_at: '2026-11-23T08:00:00Z',
    }

    const wrapper = mount(DeadlineCell, {
      props: { row, now: fixedNow },
    })

    expect(wrapper.find('.deadline-pill').exists()).toBe(false)
    expect(wrapper.find('.deadline-exact').text()).not.toBe('—')
  })
})
