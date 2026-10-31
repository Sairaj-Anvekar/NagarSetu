import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '../EmptyState.vue'

describe('EmptyState', () => {
  it('renders the title', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No assigned tasks' } })
    expect(wrapper.get('h3').text()).toBe('No assigned tasks')
  })

  it('renders a message when provided', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'No assigned tasks', message: 'New assignments will appear here.' },
    })
    expect(wrapper.get('p').text()).toBe('New assignments will appear here.')
  })

  it('omits the message when it is not provided', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No assigned tasks' } })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('omits an explicitly empty message', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No assigned tasks', message: '' } })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders an action supplied through the default slot', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'No assigned tasks' },
      slots: { default: '<button type="button">Refresh tasks</button>' },
    })
    expect(wrapper.get('button').text()).toBe('Refresh tasks')
  })

  it('hides the decorative icon from assistive technology', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No assigned tasks' } })
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('svg').attributes('focusable')).toBe('false')
  })
})
