import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatTile from '../StatTile.vue'

describe('StatTile', () => {
  it('renders label and value', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Total',
        value: 42,
      },
    })

    const label = wrapper.find('.stat-tile__label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Total')

    const value = wrapper.find('.stat-tile__value')
    expect(value.exists()).toBe(true)
    expect(value.text()).toBe('42')
  })

  it('renders 0 correctly when value is 0', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Overdue',
        value: 0,
      },
    })

    expect(wrapper.find('.stat-tile__value').text()).toBe('0')
  })

  it('renders optional hint when provided', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Overdue',
        value: 5,
        hint: 'Exceeded SLA deadline',
      },
    })

    const hint = wrapper.find('.stat-tile__hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toBe('Exceeded SLA deadline')
  })

  it('does not render hint element when hint prop is omitted', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Submitted',
        value: 12,
      },
    })

    expect(wrapper.find('.stat-tile__hint').exists()).toBe(false)
  })
})

