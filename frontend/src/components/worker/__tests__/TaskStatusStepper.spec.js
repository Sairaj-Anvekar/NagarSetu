import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskStatusStepper from '../TaskStatusStepper.vue'

describe('TaskStatusStepper', () => {
  const baseTime = new Date('2026-10-20T12:00:00.000Z').getTime()

  it('renders an ordered list with aria-current="step" on the Submitted step', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: { status: 'Submitted' },
    })

    const list = wrapper.get('ol[aria-label="Task progress"]')
    const items = list.findAll('li')
    expect(items).toHaveLength(3)

    expect(items[0].attributes('aria-current')).toBe('step')
    expect(items[0].classes()).toContain('ns-stepper__item--current')
    expect(items[1].attributes('aria-current')).toBeUndefined()
    expect(items[1].classes()).toContain('ns-stepper__item--future')
    expect(items[2].attributes('aria-current')).toBeUndefined()
    expect(items[2].classes()).toContain('ns-stepper__item--future')
  })

  it('marks previous steps as passed with check icon for In-Progress', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: { status: 'In-Progress' },
    })

    const items = wrapper.findAll('ol li')
    expect(items[0].classes()).toContain('ns-stepper__item--passed')
    expect(items[0].find('svg.ns-stepper__check').exists()).toBe(true)

    expect(items[1].attributes('aria-current')).toBe('step')
    expect(items[1].classes()).toContain('ns-stepper__item--current')

    expect(items[2].classes()).toContain('ns-stepper__item--future')
  })

  it('marks Submitted and In-Progress as passed when status is Completed', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: { status: 'Completed' },
    })

    const items = wrapper.findAll('ol li')
    expect(items[0].classes()).toContain('ns-stepper__item--passed')
    expect(items[1].classes()).toContain('ns-stepper__item--passed')
    expect(items[2].attributes('aria-current')).toBe('step')
    expect(items[2].classes()).toContain('ns-stepper__item--current')
  })

  it('renders overdue pill and formatted deadline when deadline is in the past', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: {
        status: 'In-Progress',
        slaDeadline: '2026-10-20T10:00:00.000Z',
        now: baseTime,
      },
    })

    const pill = wrapper.get('.ns-status-card__pill--overdue')
    expect(pill.text()).toContain('Overdue 2 h')
    expect(pill.find('.worker-detail-overdue-pill').text()).toBe('Overdue')

    const deadline = wrapper.get('.ns-status-card__deadline')
    expect(deadline.text()).toContain('Due 20 Oct')
  })

  it('renders due-soon pill and deadline when deadline is in the future', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: {
        status: 'Submitted',
        slaDeadline: '2026-10-20T15:00:00.000Z',
        now: baseTime,
      },
    })

    const pill = wrapper.get('.ns-status-card__pill--due')
    expect(pill.text()).toContain('Due in 3 h')
    expect(wrapper.find('.ns-status-card__pill--overdue').exists()).toBe(false)
  })

  it('omits time pill and deadline footer when slaDeadline is absent', () => {
    const wrapper = mount(TaskStatusStepper, {
      props: { status: 'Submitted' },
    })

    expect(wrapper.find('.ns-status-card__footer').exists()).toBe(false)
  })
})
