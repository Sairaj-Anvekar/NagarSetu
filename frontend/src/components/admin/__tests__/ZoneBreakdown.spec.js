import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ZoneBreakdown from '../ZoneBreakdown.vue'

describe('ZoneBreakdown', () => {
  it('renders each zone with name and count', () => {
    const zones = [
      { zone: 'Zone A', count: 20 },
      { zone: 'Zone B', count: 10 },
      { zone: 'Zone C', count: 5 },
    ]

    const wrapper = mount(ZoneBreakdown, {
      props: { zones },
    })

    const items = wrapper.findAll('.zone-breakdown__item')
    expect(items).toHaveLength(3)

    expect(items[0].find('.zone-breakdown__name').text()).toBe('Zone A')
    expect(items[0].find('.zone-breakdown__count').text()).toBe('20')

    expect(items[1].find('.zone-breakdown__name').text()).toBe('Zone B')
    expect(items[1].find('.zone-breakdown__count').text()).toBe('10')

    expect(items[2].find('.zone-breakdown__name').text()).toBe('Zone C')
    expect(items[2].find('.zone-breakdown__count').text()).toBe('5')
  })

  it('sets largest count bar to 100% and smaller counts to proportional width', () => {
    const zones = [
      { zone: 'Zone A', count: 20 },
      { zone: 'Zone B', count: 10 },
    ]

    const wrapper = mount(ZoneBreakdown, {
      props: { zones },
    })

    const bars = wrapper.findAll('.zone-breakdown__bar')
    expect(bars[0].attributes('style')).toContain('width: 100%')
    expect(bars[1].attributes('style')).toContain('width: 50%')
  })

  it('renders "No data" when zones array is empty', () => {
    const wrapper = mount(ZoneBreakdown, {
      props: { zones: [] },
    })

    expect(wrapper.find('.zone-breakdown__empty').exists()).toBe(true)
    expect(wrapper.find('.zone-breakdown__empty').text()).toBe('No data')
    expect(wrapper.findAll('.zone-breakdown__item')).toHaveLength(0)
  })

  it('renders "No data" when zones prop is omitted or null', () => {
    const wrapper = mount(ZoneBreakdown, {
      props: { zones: null },
    })

    expect(wrapper.find('.zone-breakdown__empty').exists()).toBe(true)
    expect(wrapper.find('.zone-breakdown__empty').text()).toBe('No data')
  })

  it('handles all counts being zero safely with 0% width', () => {
    const zones = [
      { zone: 'Zone A', count: 0 },
      { zone: 'Zone B', count: 0 },
    ]

    const wrapper = mount(ZoneBreakdown, {
      props: { zones },
    })

    const bars = wrapper.findAll('.zone-breakdown__bar')
    expect(bars[0].attributes('style')).toContain('width: 0%')
    expect(bars[1].attributes('style')).toContain('width: 0%')
  })
})

