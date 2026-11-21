import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkerHeader from '../WorkerHeader.vue'

describe('WorkerHeader', () => {
  it('renders the greeting variant with the supplied name and initials', () => {
    const wrapper = mount(WorkerHeader, {
      props: { variant: 'greeting', name: 'Ravi Patil', hour: 9 },
    })
    expect(wrapper.get('h1').text()).toBe('Ravi Patil')
    expect(wrapper.get('.ns-worker-header__avatar').text()).toBe('RP')
    expect(wrapper.get('.ns-worker-header__avatar').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.ns-worker-header__title').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
  ])('greets at hour %i with %s', (hour, greeting) => {
    const wrapper = mount(WorkerHeader, { props: { variant: 'greeting', hour } })
    expect(wrapper.get('.ns-worker-header__greeting').text()).toBe(greeting)
    wrapper.unmount()
  })

  it('updates the greeting when the supplied hour changes', async () => {
    const wrapper = mount(WorkerHeader, { props: { variant: 'greeting', hour: 11 } })
    await wrapper.setProps({ hour: 12 })
    expect(wrapper.get('.ns-worker-header__greeting').text()).toBe('Good afternoon')
    await wrapper.setProps({ hour: 17 })
    expect(wrapper.get('.ns-worker-header__greeting').text()).toBe('Good evening')
    wrapper.unmount()
  })

  it('defaults hour to the current local hour without needing a clock mock', () => {
    const before = new Date().getHours()
    const wrapper = mount(WorkerHeader, { props: { variant: 'greeting' } })
    const after = new Date().getHours()
    expect([before, after]).toContain(wrapper.props('hour'))
    wrapper.unmount()
  })

  it('renders the title variant with an optional subtitle and no greeting avatar', async () => {
    const wrapper = mount(WorkerHeader, { props: { variant: 'title', title: 'History' } })
    expect(wrapper.get('h1').text()).toBe('History')
    expect(wrapper.find('.ns-worker-header__subtitle').exists()).toBe(false)
    expect(wrapper.find('.ns-worker-header__avatar').exists()).toBe(false)
    expect(wrapper.find('.ns-worker-header__greeting').exists()).toBe(false)
    await wrapper.setProps({ subtitle: 'Your completed tasks' })
    expect(wrapper.get('.ns-worker-header__subtitle').text()).toBe('Your completed tasks')
    wrapper.unmount()
  })

  it('shows a chip only when a nonblank value is provided', async () => {
    const wrapper = mount(WorkerHeader, { props: { title: 'Tasks' } })
    expect(wrapper.find('.ns-worker-header__chip').exists()).toBe(false)
    await wrapper.setProps({ chip: 'Sanitation · Zone A' })
    expect(wrapper.get('.ns-worker-header__chip').text()).toBe('Sanitation · Zone A')
    expect(wrapper.get('.ns-worker-header__dot').attributes('aria-hidden')).toBe('true')
    await wrapper.setProps({ chip: '   ' })
    expect(wrapper.find('.ns-worker-header__chip').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders supplied slot content after the main row', () => {
    const wrapper = mount(WorkerHeader, {
      props: { title: 'Tasks' },
      slots: { default: '<p>Three tasks today</p>' },
    })
    const row = wrapper.get('.ns-worker-header__row')
    const content = wrapper.get('.ns-worker-header__content')
    expect(content.text()).toBe('Three tasks today')
    expect(row.element.nextElementSibling).toBe(content.element)
    wrapper.unmount()
  })
})
