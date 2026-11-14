import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  Legend: {},
  LineElement: {},
  PointElement: {},
  CategoryScale: {},
  LinearScale: {},
}))

vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div class="mock-line-chart" />',
  },
}))

import TrendChart from '../TrendChart.vue'

describe('TrendChart', () => {
  it('renders two datasets named "Created" (solid) and "Completed" (dashed)', () => {
    const trends = [
      { date: '2026-11-01', created: 3, completed: 2 },
      { date: '2026-11-14', created: 5, completed: 4 },
      { date: '2026-11-30', created: 1, completed: 0 },
    ]

    const wrapper = mount(TrendChart, {
      props: { trends },
    })

    const line = wrapper.findComponent({ name: 'Line' })
    expect(line.exists()).toBe(true)

    const datasets = line.props('data').datasets
    expect(datasets).toHaveLength(2)

    const createdDs = datasets.find((ds) => ds.label === 'Created')
    const completedDs = datasets.find((ds) => ds.label === 'Completed')

    expect(createdDs).toBeDefined()
    expect(completedDs).toBeDefined()

    expect(createdDs.borderDash).toEqual([])
    expect(completedDs.borderDash).toEqual([5, 5])

    expect(createdDs.data).toEqual([3, 5, 1])
    expect(completedDs.data).toEqual([2, 4, 0])
  })

  it('formats date labels like "14 Nov" and keeps 1st and 31st dates without timezone shifts', () => {
    const trends = [
      { date: '2026-11-01', created: 0, completed: 0 },
      { date: '2026-11-14', created: 0, completed: 0 },
      { date: '2026-12-31', created: 0, completed: 0 },
    ]

    const wrapper = mount(TrendChart, {
      props: { trends },
    })

    const line = wrapper.findComponent({ name: 'Line' })
    const labels = line.props('data').labels
    expect(labels).toEqual(['1 Nov', '14 Nov', '31 Dec'])
  })

  it('configures y-axis min 0, integer ticks, visible legend, and disabled animation', () => {
    const trends = [{ date: '2026-11-14', created: 2, completed: 1 }]

    const wrapper = mount(TrendChart, {
      props: { trends },
    })

    const line = wrapper.findComponent({ name: 'Line' })
    const options = line.props('options')

    expect(options.animation).toBe(false)
    expect(options.plugins.legend.display).toBe(true)
    expect(options.scales.y.beginAtZero).toBe(true)
    expect(options.scales.y.min).toBe(0)
    expect(options.scales.y.ticks.precision).toBe(0)
  })

  it('sets role="img" and an aria-label summarizing total created and completed counts', () => {
    const trends = [
      { date: '2026-11-13', created: 4, completed: 3 },
      { date: '2026-11-14', created: 6, completed: 5 },
    ]

    const wrapper = mount(TrendChart, {
      props: { trends },
    })

    const container = wrapper.find('.trend-chart__container')
    expect(container.exists()).toBe(true)
    expect(container.attributes('role')).toBe('img')
    expect(container.attributes('aria-label')).toBe(
      'Complaint trends over 2 days: 10 created, 8 completed',
    )
  })

  it('renders "No data" and no chart when trends is empty or omitted', () => {
    const wrapper = mount(TrendChart, {
      props: { trends: [] },
    })

    expect(wrapper.find('.trend-chart__empty').exists()).toBe(true)
    expect(wrapper.find('.trend-chart__empty').text()).toBe('No data')
    expect(wrapper.findComponent({ name: 'Line' }).exists()).toBe(false)

    const wrapperEmpty = mount(TrendChart)
    expect(wrapperEmpty.find('.trend-chart__empty').exists()).toBe(true)
    expect(wrapperEmpty.findComponent({ name: 'Line' }).exists()).toBe(false)
  })
})
