import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '../PageHeader.vue'

describe('PageHeader', () => {
  it('renders the title in an h1', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Dashboard' } })

    expect(wrapper.get('h1').text()).toBe('Dashboard')
  })

  it('renders the subtitle when provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Dashboard', subtitle: 'Overview of complaints and workers.' },
    })

    expect(wrapper.get('p').text()).toBe('Overview of complaints and workers.')
  })

  it('omits the subtitle when not provided', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Dashboard' } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('omits an explicitly empty subtitle', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Dashboard', subtitle: '' } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders the actions named slot', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Workers' },
      slots: { actions: '<button type="button">Add worker</button>' },
    })

    expect(wrapper.get('button').text()).toBe('Add worker')
  })
})
