import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HistorySegmentedControl from '../HistorySegmentedControl.vue'

describe('HistorySegmentedControl', () => {
  it('renders tablist with two tabs and displays week count', () => {
    const wrapper = mount(HistorySegmentedControl, {
      props: {
        modelValue: 'week',
        weekCount: 5,
      },
    })

    const tablist = wrapper.get('[role="tablist"]')
    expect(tablist.attributes('aria-label')).toBe('History period')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)

    expect(tabs[0].text()).toBe('This week · 5')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[0].classes()).toContain('ns-history-segmented__btn--active')

    expect(tabs[1].text()).toBe('This month')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[1].classes()).not.toContain('ns-history-segmented__btn--active')
  })

  it('reflects month selection when modelValue is "month"', () => {
    const wrapper = mount(HistorySegmentedControl, {
      props: {
        modelValue: 'month',
        weekCount: 3,
      },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
    expect(tabs[1].classes()).toContain('ns-history-segmented__btn--active')
  })

  it('emits update:modelValue when tabs are clicked', async () => {
    const wrapper = mount(HistorySegmentedControl, {
      props: {
        modelValue: 'week',
        weekCount: 2,
      },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['month']])

    await tabs[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')[1]).toEqual(['week'])
  })
})
