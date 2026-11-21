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
import { getChartTheme } from '../../../utils/chartTheme'

describe('CategoryChart', () => {
  it('keeps a chart box with a row-based height, bounded between 260px and 420px', async () => {
    const wrapper = mount(CategoryChart)
    const box = wrapper.get('.category-chart')
    expect(box.element.style.height).toBe('320px')

    for (const [rows, height] of [[1, 260], [6, 264], [8, 352], [10, 420], [20, 420]]) {
      await wrapper.setProps({
        categories: Array.from({ length: rows }, (_, index) => ({
          category: `Category ${index + 1}`,
          count: index + 1,
        })),
      })
      expect(box.element.style.height).toBe(`${height}px`)
      expect(box.findComponent({ name: 'Bar' }).exists()).toBe(true)
    }

    await wrapper.setProps({ categories: [] })
    expect(box.element.style.height).toBe('320px')
    expect(box.findComponent({ name: 'Bar' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('applies six palette colors and rounds both ends of the bars', () => {
    const categories = ['A', 'B', 'C', 'D', 'E', 'F'].map((category, index) => ({
      category, count: 6 - index,
    }))
    const wrapper = mount(CategoryChart, { props: { categories } })
    const bar = wrapper.getComponent({ name: 'Bar' })
    const dataset = bar.props('data').datasets[0]
    expect(dataset.backgroundColor).toEqual(getChartTheme().palette)
    expect(new Set(dataset.backgroundColor).size).toBe(6)
    expect(dataset.borderRadius).toBeGreaterThan(0)
    expect(dataset.borderSkipped).toBe(false)
    expect(bar.props('options').scales.x.border.dash).toEqual([2, 4])
    expect(bar.props('data').labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    wrapper.unmount()
  })

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

