import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HotspotList from '../HotspotList.vue'

describe('HotspotList', () => {
  it('renders hotspots sorted by count descending', () => {
    const hotspots = [
      { id: 'h-1', lat: 17.65, lng: 75.85, count: 4, label: 'Cluster C', category: 'Water' },
      { id: 'h-2', lat: 17.68, lng: 75.88, count: 25, label: 'Cluster A', category: 'Garbage Dump' },
      { id: 'h-3', lat: 17.67, lng: 75.87, count: 11, label: 'Cluster B', category: 'Drainage' },
    ]

    const wrapper = mount(HotspotList, {
      props: { hotspots },
    })

    const items = wrapper.findAll('.hotspot-list__item')
    expect(items).toHaveLength(3)

    expect(items[0].find('.hotspot-list__label').text()).toBe('Cluster A')
    expect(items[0].find('.hotspot-list__count').text()).toBe('25')
    expect(items[0].find('.hotspot-list__rank').text()).toBe('#1')

    expect(items[1].find('.hotspot-list__label').text()).toBe('Cluster B')
    expect(items[1].find('.hotspot-list__count').text()).toBe('11')
    expect(items[1].find('.hotspot-list__rank').text()).toBe('#2')

    expect(items[2].find('.hotspot-list__label').text()).toBe('Cluster C')
    expect(items[2].find('.hotspot-list__count').text()).toBe('4')
    expect(items[2].find('.hotspot-list__rank').text()).toBe('#3')
  })

  it('shows label, count and category as text with correct pluralization', () => {
    const hotspots = [
      { id: 'h-1', lat: 17.68, lng: 75.88, count: 5, label: 'Multi Issue Area', category: '' },
      { id: 'h-2', lat: 17.67, lng: 75.87, count: 1, label: 'Single Issue Area', category: 'Streetlight' },
    ]

    const wrapper = mount(HotspotList, {
      props: { hotspots },
    })

    const items = wrapper.findAll('.hotspot-list__item')
    expect(items[0].find('.hotspot-list__label').text()).toBe('Multi Issue Area')
    expect(items[0].find('.hotspot-list__count').text()).toBe('5')
    expect(items[0].find('.hotspot-list__count-unit').text()).toBe('complaints')
    expect(items[0].find('.hotspot-list__category').exists()).toBe(false)

    expect(items[1].find('.hotspot-list__label').text()).toBe('Single Issue Area')
    expect(items[1].find('.hotspot-list__count').text()).toBe('1')
    expect(items[1].find('.hotspot-list__count-unit').text()).toBe('complaint')
    expect(items[1].find('.hotspot-list__category-tag').text()).toBe('Streetlight')
  })

  it('renders an empty message when hotspots array is empty or invalid', () => {
    const emptyWrapper = mount(HotspotList, {
      props: { hotspots: [] },
    })

    expect(emptyWrapper.find('.hotspot-list__empty').exists()).toBe(true)
    expect(emptyWrapper.text()).toContain('No hotspots found')
    expect(emptyWrapper.findAll('.hotspot-list__item')).toHaveLength(0)

    const nullWrapper = mount(HotspotList, {
      props: { hotspots: null },
    })

    expect(nullWrapper.find('.hotspot-list__empty').exists()).toBe(true)
    expect(nullWrapper.text()).toContain('No hotspots found')
  })

  it('never prints raw coordinate text anywhere', () => {
    const hotspots = [
      {
        id: 'h-1',
        lat: 17.681234,
        lng: 75.889876,
        count: 14,
        label: 'Central Market Depot',
        category: 'Solid Waste',
      },
    ]

    const wrapper = mount(HotspotList, {
      props: { hotspots },
    })

    const renderedText = wrapper.text()
    expect(renderedText).not.toContain('17.681234')
    expect(renderedText).not.toContain('75.889876')
    expect(renderedText).not.toContain('17.68')
    expect(renderedText).not.toContain('75.88')
    expect(renderedText).toContain('Central Market Depot')
    expect(renderedText).toContain('14')
    expect(renderedText).toContain('Solid Waste')
  })
})
