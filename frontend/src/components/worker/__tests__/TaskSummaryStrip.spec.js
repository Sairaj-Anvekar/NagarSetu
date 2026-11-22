import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskSummaryStrip from '../TaskSummaryStrip.vue'

// Fixed "now" = 2026-01-15T12:00:00.000Z — same anchor as taskDisplay.spec.js.
const NOW = new Date('2026-01-15T12:00:00.000Z').getTime()

function makeTask(overrides = {}) {
  return {
    id: 't1',
    status: 'Submitted',
    sla_deadline: '2026-01-16T12:00:00.000Z', // 1 day from NOW — not overdue
    is_overdue: false,
    ...overrides,
  }
}

// 2 Submitted (1 overdue) + 2 In-Progress (1 overdue) = 4 tasks, 2 overdue
const mixedTasks = [
  makeTask({ status: 'Submitted',   sla_deadline: '2026-01-14T00:00:00.000Z' }), // overdue
  makeTask({ status: 'Submitted',   sla_deadline: '2026-01-20T00:00:00.000Z' }), // not overdue
  makeTask({ status: 'In-Progress', sla_deadline: '2026-01-13T00:00:00.000Z' }), // overdue
  makeTask({ status: 'In-Progress', sla_deadline: '2026-01-20T00:00:00.000Z' }), // not overdue
]

describe('TaskSummaryStrip', () => {
  it('renders three cards: Submitted, In-Progress and Overdue', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: [], now: NOW },
    })

    expect(wrapper.find('[data-testid="strip-submitted"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strip-in-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strip-overdue"]').exists()).toBe(true)

    expect(wrapper.find('[data-testid="strip-submitted"]').text()).toContain('Submitted')
    expect(wrapper.find('[data-testid="strip-in-progress"]').text()).toContain('In-Progress')
    expect(wrapper.find('[data-testid="strip-overdue"]').text()).toContain('Overdue')
  })

  it('shows all zeros for an empty tasks array', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: [], now: NOW },
    })

    expect(wrapper.find('[data-testid="strip-submitted"]').find('.task-summary-strip__number').text()).toBe('0')
    expect(wrapper.find('[data-testid="strip-in-progress"]').find('.task-summary-strip__number').text()).toBe('0')
    expect(wrapper.find('[data-testid="strip-overdue"]').find('.task-summary-strip__number').text()).toBe('0')
  })

  it('shows correct Submitted, In-Progress and Overdue counts for mixed tasks', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: mixedTasks, now: NOW },
    })

    expect(wrapper.find('[data-testid="strip-submitted"]').find('.task-summary-strip__number').text()).toBe('2')
    expect(wrapper.find('[data-testid="strip-in-progress"]').find('.task-summary-strip__number').text()).toBe('2')
    expect(wrapper.find('[data-testid="strip-overdue"]').find('.task-summary-strip__number').text()).toBe('2')
  })

  it('applies the overdue colour class to the Overdue number when count is above zero', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: mixedTasks, now: NOW },
    })

    const overdueNum = wrapper
      .find('[data-testid="strip-overdue"]')
      .find('.task-summary-strip__number')

    expect(overdueNum.classes()).toContain('task-summary-strip__number--overdue')
  })

  it('does NOT apply the overdue colour class when overdue count is zero', () => {
    const noOverdueTasks = [
      makeTask({ status: 'Submitted',   sla_deadline: '2026-01-20T00:00:00.000Z' }),
      makeTask({ status: 'In-Progress', sla_deadline: '2026-01-20T00:00:00.000Z' }),
    ]
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: noOverdueTasks, now: NOW },
    })

    const overdueNum = wrapper
      .find('[data-testid="strip-overdue"]')
      .find('.task-summary-strip__number')

    expect(overdueNum.classes()).not.toContain('task-summary-strip__number--overdue')
  })

  it('does NOT count a Completed task as overdue even when its deadline is past', () => {
    const tasksWithCompleted = [
      ...mixedTasks,
      makeTask({ status: 'Completed', sla_deadline: '2026-01-01T00:00:00.000Z' }),
    ]
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: tasksWithCompleted, now: NOW },
    })

    const overdueNum = wrapper
      .find('[data-testid="strip-overdue"]')
      .find('.task-summary-strip__number')

    // Still 2, not 3
    expect(overdueNum.text()).toBe('2')
  })

  it('accepts now as a Date object', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: mixedTasks, now: new Date(NOW) },
    })

    expect(
      wrapper.find('[data-testid="strip-overdue"]').find('.task-summary-strip__number').text()
    ).toBe('2')
  })

  it('has role="region" and an accessible label', () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: [], now: NOW },
    })

    const strip = wrapper.find('.task-summary-strip')
    expect(strip.attributes('role')).toBe('region')
    expect(strip.attributes('aria-label')).toBeTruthy()
  })

  it('updates counts reactively when the tasks prop changes', async () => {
    const wrapper = mount(TaskSummaryStrip, {
      props: { tasks: [], now: NOW },
    })

    expect(
      wrapper.find('[data-testid="strip-submitted"]').find('.task-summary-strip__number').text()
    ).toBe('0')

    await wrapper.setProps({ tasks: mixedTasks })

    expect(
      wrapper.find('[data-testid="strip-submitted"]').find('.task-summary-strip__number').text()
    ).toBe('2')
  })
})
