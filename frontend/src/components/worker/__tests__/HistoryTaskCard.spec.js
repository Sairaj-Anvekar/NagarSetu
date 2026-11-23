import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTaskCard from '../HistoryTaskCard.vue'

describe('HistoryTaskCard', () => {
  const sampleTask = {
    id: 't-101',
    tracking_code: 'GRV-2026-4KQ2',
    category: 'Solid Waste & Garbage',
    resolved_at: '2026-11-19T10:42:00.000Z',
    zone: 'Zone A',
  }

  it('renders check badge, category, tracking code, formatted completion time and zone pill', () => {
    const wrapper = mount(HistoryTaskCard, {
      props: {
        task: sampleTask,
      },
    })

    expect(wrapper.get('.worker-history-card__category').text()).toBe('Solid Waste & Garbage')
    expect(wrapper.get('.worker-history-card__tracking').text()).toBe('GRV-2026-4KQ2')
    expect(wrapper.get('.worker-history-card__meta').text()).toContain('GRV-2026-4KQ2')
    expect(wrapper.get('.worker-history-card__zone-pill').text()).toBe('Zone A')
    expect(wrapper.find('.worker-history-card__check-icon').exists()).toBe(true)
  })

  it('omits zone pill when zone is not provided', () => {
    const wrapper = mount(HistoryTaskCard, {
      props: {
        task: {
          id: 't-102',
          tracking_code: 'GRV-2026-8888',
          category: 'Streetlight',
          resolved_at: '2026-11-19T11:00:00.000Z',
        },
      },
    })

    expect(wrapper.find('.worker-history-card__zone-pill').exists()).toBe(false)
  })

  it('handles zone as an object { name: "Zone B" }', () => {
    const wrapper = mount(HistoryTaskCard, {
      props: {
        task: {
          ...sampleTask,
          zone: { id: 'z2', name: 'Zone B' },
        },
      },
    })

    expect(wrapper.get('.worker-history-card__zone-pill').text()).toBe('Zone B')
  })

  it('is non-clickable and never displays citizen personal information or coordinates', () => {
    const wrapper = mount(HistoryTaskCard, {
      props: {
        task: {
          ...sampleTask,
          latitude: 17.6805,
          longitude: 75.8812,
          citizen_name: 'Pooja Patil',
          citizen_phone: '+919876543210',
        },
      },
    })

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('17.6805')
    expect(wrapper.text()).not.toContain('75.8812')
    expect(wrapper.text()).not.toContain('Pooja Patil')
    expect(wrapper.text()).not.toContain('+919876543210')
  })
})
