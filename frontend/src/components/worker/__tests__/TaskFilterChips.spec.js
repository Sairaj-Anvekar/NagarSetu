import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskFilterChips from '../TaskFilterChips.vue'

// Fixed "now" = 2026-01-15T12:00:00.000Z
const NOW = new Date('2026-01-15T12:00:00.000Z').getTime()

function makeTask(overrides = {}) {
  return {
    id: 't1',
    status: 'Submitted',
    sla_deadline: '2026-01-20T00:00:00.000Z', // future — not overdue by default
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

describe('TaskFilterChips', () => {
  it('renders exactly 4 chips: All, Submitted, In-Progress and Overdue', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: [], now: NOW },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips).toHaveLength(4)

    const labels = chips.map((c) => c.text())
    expect(labels[0]).toContain('All')
    expect(labels[1]).toContain('Submitted')
    expect(labels[2]).toContain('In-Progress')
    expect(labels[3]).toContain('Overdue')
  })

  it('displays counts inline with each label (e.g. "All · 4")', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[0].text()).toContain('4')  // All · 4
    expect(chips[1].text()).toContain('2')  // Submitted · 2
    expect(chips[2].text()).toContain('2')  // In-Progress · 2
    expect(chips[3].text()).toContain('2')  // Overdue · 2
  })

  it('defaults to "All" selected: All chip has aria-pressed true, others false', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: [], now: NOW },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[0].attributes('aria-pressed')).toBe('true')
    expect(chips[1].attributes('aria-pressed')).toBe('false')
    expect(chips[2].attributes('aria-pressed')).toBe('false')
    expect(chips[3].attributes('aria-pressed')).toBe('false')
  })

  it('marks the chip matching the filter prop as active', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW, filter: 'Submitted' },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[1].attributes('aria-pressed')).toBe('true')
    expect(chips[1].classes()).toContain('task-filter-chips__chip--active')
    // All other chips are inactive
    expect(chips[0].attributes('aria-pressed')).toBe('false')
    expect(chips[2].attributes('aria-pressed')).toBe('false')
    expect(chips[3].attributes('aria-pressed')).toBe('false')
  })

  it('emits "update:filter" with the new key when an unselected chip is clicked', async () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW, filter: 'all' },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    await chips[2].trigger('click') // In-Progress
    expect(wrapper.emitted('update:filter')).toHaveLength(1)
    expect(wrapper.emitted('update:filter')[0]).toEqual(['In-Progress'])
  })

  it('emits "update:filter" with "overdue" when the Overdue chip is clicked', async () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW, filter: 'all' },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    await chips[3].trigger('click')
    expect(wrapper.emitted('update:filter')[0]).toEqual(['overdue'])
  })

  it('does NOT emit when the already-selected chip is clicked again', async () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW, filter: 'Submitted' },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    await chips[1].trigger('click') // clicking already-active Submitted
    expect(wrapper.emitted('update:filter')).toBeFalsy()
  })

  it('every chip has an aria-pressed attribute (true or false)', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: NOW },
    })
    for (const chip of wrapper.findAll('.task-filter-chips__chip')) {
      const val = chip.attributes('aria-pressed')
      expect(val === 'true' || val === 'false').toBe(true)
    }
  })

  it('every chip is a <button type="button">', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: [], now: NOW },
    })
    for (const chip of wrapper.findAll('.task-filter-chips__chip')) {
      expect(chip.element.tagName).toBe('BUTTON')
      expect(chip.attributes('type')).toBe('button')
    }
  })

  it('has role="group" and an accessible aria-label on the wrapper', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: [], now: NOW },
    })
    const group = wrapper.find('.task-filter-chips')
    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBeTruthy()
  })

  it('accepts now as a Date object and counts correctly', () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: mixedTasks, now: new Date(NOW) },
    })
    const chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[3].text()).toContain('2') // Overdue · 2
  })

  it('updates counts reactively when tasks prop changes', async () => {
    const wrapper = mount(TaskFilterChips, {
      props: { tasks: [], now: NOW },
    })
    let chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[0].text()).toContain('0') // All · 0

    await wrapper.setProps({ tasks: mixedTasks })
    chips = wrapper.findAll('.task-filter-chips__chip')
    expect(chips[0].text()).toContain('4') // All · 4
  })
})
