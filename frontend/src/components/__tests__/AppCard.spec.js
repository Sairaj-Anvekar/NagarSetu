import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppCard from '../AppCard.vue'

describe('AppCard', () => {
  it('renders title in a card-header with bold styling', () => {
    const wrapper = mount(AppCard, {
      props: { title: 'Grievance Overview' },
    })

    const header = wrapper.find('.card-header')
    expect(header.exists()).toBe(true)
    expect(header.classes()).toContain('fw-bold')
    expect(header.text()).toBe('Grievance Overview')
  })

  it('does not render a card-header when title is empty', () => {
    const wrapper = mount(AppCard)

    expect(wrapper.find('.card-header').exists()).toBe(false)
  })

  it('renders default slot content inside card-body', () => {
    const wrapper = mount(AppCard, {
      slots: {
        default: '<p class="test-body">Main card body content</p>',
      },
    })

    const body = wrapper.find('.card-body')
    expect(body.exists()).toBe(true)
    expect(body.find('.test-body').text()).toBe('Main card body content')
  })

  it('renders footer only when footer slot is provided', () => {
    const wrapperWithoutFooter = mount(AppCard)
    expect(wrapperWithoutFooter.find('.card-footer').exists()).toBe(false)

    const wrapperWithFooter = mount(AppCard, {
      slots: {
        footer: '<span class="test-footer">Card footer notes</span>',
      },
    })

    const footer = wrapperWithFooter.find('.card-footer')
    expect(footer.exists()).toBe(true)
    expect(footer.find('.test-footer').text()).toBe('Card footer notes')
  })
})
