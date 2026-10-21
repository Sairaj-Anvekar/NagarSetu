import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingSpinner from '../LoadingSpinner.vue'

describe('LoadingSpinner', () => {
  it('renders default label text and has role="status"', () => {
    const wrapper = mount(LoadingSpinner)
    const spinner = wrapper.find('[role="status"]')

    expect(spinner.exists()).toBe(true)
    expect(spinner.text()).toBe('Loading...')
    expect(spinner.find('.visually-hidden').text()).toBe('Loading...')
  })

  it('renders a custom label', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { label: 'Fetching complaints...' },
    })

    expect(wrapper.find('[role="status"]').text()).toBe('Fetching complaints...')
  })

  it('adds spinner-border-sm class when size is "sm"', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { size: 'sm' },
    })
    const spinner = wrapper.find('[role="status"]')

    expect(spinner.classes()).toContain('spinner-border')
    expect(spinner.classes()).toContain('spinner-border-sm')
  })

  it('sets inline 3rem style when size is "lg"', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { size: 'lg' },
    })
    const spinner = wrapper.find('[role="status"]')

    expect(spinner.classes()).toContain('spinner-border')
    expect(spinner.attributes('style')).toContain('width: 3rem')
    expect(spinner.attributes('style')).toContain('height: 3rem')
  })

  it('adds centered wrapper with justify-content-center when centered is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: { centered: true },
    })

    expect(wrapper.classes()).toContain('justify-content-center')
    expect(wrapper.classes()).toContain('d-flex')
    expect(wrapper.classes()).toContain('py-4')
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })
})
