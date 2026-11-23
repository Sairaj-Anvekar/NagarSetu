import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartCard from '../ChartCard.vue'

describe('ChartCard', () => {
  it('renders title, subtitle, and body content', () => {
    const wrapper = mount(ChartCard, {
      props: {
        title: 'Complaints by Category',
        subtitle: 'Volume breakdown',
      },
      slots: {
        default: '<div class="test-content">Chart content</div>',
      },
    })

    expect(wrapper.get('.chart-card__title').text()).toBe('Complaints by Category')
    expect(wrapper.get('.chart-card__subtitle').text()).toBe('Volume breakdown')
    expect(wrapper.get('.test-content').text()).toBe('Chart content')
  })

  it('renders actions slot when provided', () => {
    const wrapper = mount(ChartCard, {
      props: { title: 'Complaint Trends' },
      slots: {
        actions: '<button type="button" class="action-btn">Filter</button>',
      },
    })

    expect(wrapper.get('.action-btn').text()).toBe('Filter')
  })

  it('omits subtitle element when subtitle is blank', () => {
    const wrapper = mount(ChartCard, {
      props: { title: 'By Zone' },
    })

    expect(wrapper.find('.chart-card__subtitle').exists()).toBe(false)
  })
})
