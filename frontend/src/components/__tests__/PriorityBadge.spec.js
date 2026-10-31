import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PriorityBadge from '../PriorityBadge.vue'

// Shared shape uses ns-badge; low background, border, and text use ns-badge--low.
// Keep each original styling assertion alongside the unchanged label checks.
describe('PriorityBadge', () => {
  it('renders "critical" priority with "Critical" and ns-badge--critical', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'critical' },
    })

    expect(wrapper.text()).toBe('Critical')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--critical')
  })

  it('renders "high" priority with "High" and ns-badge--high', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'high' },
    })

    expect(wrapper.text()).toBe('High')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--high')
  })

  it('renders "medium" priority with "Medium" and ns-badge--medium', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'medium' },
    })

    expect(wrapper.text()).toBe('Medium')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--medium')
  })

  it('renders "low" priority with "Low" and fallback low styling', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'low' },
    })

    expect(wrapper.text()).toBe('Low')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--low')
    expect(wrapper.classes()).toContain('ns-badge--low')
    expect(wrapper.classes()).toContain('ns-badge--low')
  })

  it('renders unknown priority with raw text and fallback styling', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'urgent' },
    })

    expect(wrapper.text()).toBe('urgent')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--low')
    expect(wrapper.classes()).toContain('ns-badge--low')
    expect(wrapper.classes()).toContain('ns-badge--low')
  })
})
