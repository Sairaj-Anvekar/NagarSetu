import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders "Submitted" with ns-badge--submitted', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Submitted' },
    })

    expect(wrapper.text()).toBe('Submitted')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--submitted')
  })

  it('renders "In-Progress" with ns-badge--in-progress', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'In-Progress' },
    })

    expect(wrapper.text()).toBe('In-Progress')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--in-progress')
  })

  it('renders "Completed" with ns-badge--completed', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Completed' },
    })

    expect(wrapper.text()).toBe('Completed')
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--completed')
  })

  it('renders unknown status with fallback classes', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Unknown' },
    })

    expect(wrapper.text()).toBe('Unknown')
    expect(wrapper.classes()).toContain('ns-badge')
    // Neutral background and text now belong to the shared badge class.
    expect(wrapper.classes()).toContain('ns-badge')
    expect(wrapper.classes()).toContain('ns-badge--unknown')
    expect(wrapper.classes()).toContain('ns-badge')
  })
})
