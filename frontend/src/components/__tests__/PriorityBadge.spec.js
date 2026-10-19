import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PriorityBadge from '../PriorityBadge.vue'

describe('PriorityBadge', () => {
  it('renders "critical" priority with "Critical" and text-bg-danger', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'critical' },
    })

    expect(wrapper.text()).toBe('Critical')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('rounded-pill')
    expect(wrapper.classes()).toContain('text-bg-danger')
  })

  it('renders "high" priority with "High" and text-bg-warning', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'high' },
    })

    expect(wrapper.text()).toBe('High')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('rounded-pill')
    expect(wrapper.classes()).toContain('text-bg-warning')
  })

  it('renders "medium" priority with "Medium" and text-bg-secondary', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'medium' },
    })

    expect(wrapper.text()).toBe('Medium')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('rounded-pill')
    expect(wrapper.classes()).toContain('text-bg-secondary')
  })

  it('renders "low" priority with "Low" and fallback low styling', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'low' },
    })

    expect(wrapper.text()).toBe('Low')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('rounded-pill')
    expect(wrapper.classes()).toContain('text-bg-light')
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('text-dark')
  })

  it('renders unknown priority with raw text and fallback styling', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'urgent' },
    })

    expect(wrapper.text()).toBe('urgent')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('rounded-pill')
    expect(wrapper.classes()).toContain('text-bg-light')
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('text-dark')
  })
})
