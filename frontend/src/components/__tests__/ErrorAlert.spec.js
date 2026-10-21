import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorAlert from '../ErrorAlert.vue'

describe('ErrorAlert', () => {
  it('renders message, default title, and has role="alert"', () => {
    const wrapper = mount(ErrorAlert, {
      props: { message: 'Network connection failed' },
    })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('alert')
    expect(wrapper.classes()).toContain('alert-danger')
    expect(wrapper.find('h6').text()).toBe('Something went wrong')
    expect(wrapper.text()).toContain('Network connection failed')
  })

  it('renders a custom title', () => {
    const wrapper = mount(ErrorAlert, {
      props: {
        title: 'Authentication Error',
        message: 'Invalid credentials provided',
      },
    })

    expect(wrapper.find('h6').text()).toBe('Authentication Error')
    expect(wrapper.text()).toContain('Invalid credentials provided')
  })

  it('does not render a retry button when showRetry is false', () => {
    const wrapper = mount(ErrorAlert, {
      props: {
        message: 'Could not load data',
        showRetry: false,
      },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders a retry button when showRetry is true and emits retry on click', async () => {
    const wrapper = mount(ErrorAlert, {
      props: {
        message: 'Server timeout occurred',
        showRetry: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Try again')

    await button.trigger('click')

    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
