import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  Legend: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
}))

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    props: ['data', 'options'],
    template: '<div class="mock-bar-chart" />',
  },
}))

import CategoryChart from '../CategoryChart.vue'

describe('CategoryChart', () => {
  it('sorts dataset values and labels by count descending and sets horizontal axis', () => {
    const categories = [
      { category: 'Drainage', count: 4 },
      { category: 'Solid Waste', count: 12 },
      { category: 'Pothole', count: 8 },
    ]

    const wrapper = mount(CategoryChart, {
      props: { categories },
    })

    const bar = wrapper.findComponent({ name: 'Bar' })
    expect(bar.exists()).toBe(true)

    const data = bar.props('data')
    expect(data.labels).toEqual(['Solid Waste', 'Pothole', 'Drainage'])
    expect(data.datasets[0].data).toEqual([12, 8, 4])

    const options = bar.props('options')
    expect(options.indexAxis).toBe('y')
    expect(options.animation).toBe(false)
  })

  it('sets role="img" and an aria-label that summarizes top category and counts', () => {
    const categories = [
      { category: 'Solid Waste', count: 12 },
      { category: 'Drainage', count: 4 },
    ]

    const wrapper = mount(CategoryChart, {
      props: { categories },
    })

    const container = wrapper.find('.category-chart__container')
    expect(container.exists()).toBe(true)
    expect(container.attributes('role')).toBe('img')
    expect(container.attributes('aria-label')).toBe(
      'Complaints by category: Solid Waste 12, Drainage 4',
    )
  })

  it('renders "No data" text and no chart when input is empty', () => {
    const wrapper = mount(CategoryChart, {
      props: { categories: [] },
    })

    expect(wrapper.find('.category-chart__empty').exists()).toBe(true)
    expect(wrapper.find('.category-chart__empty').text()).toBe('No data')
    expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(false)
  })

  it('renders "No data" when categories prop is omitted', () => {
    const wrapper = mount(CategoryChart)

    expect(wrapper.find('.category-chart__empty').exists()).toBe(true)
    expect(wrapper.find('.category-chart__empty').text()).toBe('No data')
    expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(false)
  })
})

