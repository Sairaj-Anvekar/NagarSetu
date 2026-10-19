import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders "Submitted" with text-bg-info', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Submitted' },
    })

    expect(wrapper.text()).toBe('Submitted')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('text-bg-info')
  })

  it('renders "In-Progress" with text-bg-primary', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'In-Progress' },
    })

    expect(wrapper.text()).toBe('In-Progress')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('text-bg-primary')
  })

  it('renders "Completed" with text-bg-success', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Completed' },
    })

    expect(wrapper.text()).toBe('Completed')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('text-bg-success')
  })

  it('renders unknown status with fallback classes', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Unknown' },
    })

    expect(wrapper.text()).toBe('Unknown')
    expect(wrapper.classes()).toContain('badge')
    expect(wrapper.classes()).toContain('text-bg-light')
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('text-dark')
  })
})
