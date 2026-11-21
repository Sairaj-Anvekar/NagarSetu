import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
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
import { getChartTheme } from '../../../utils/chartTheme'

describe('TrendChart', () => {
  it('keeps the chart inside its own box when trend data changes', async () => {
    const wrapper = mount(TrendChart, {
      props: { trends: [{ date: '2026-11-14', created: 2, completed: 1 }] },
    })
    const box = wrapper.get('.trend-chart')
    expect(box.get('.trend-chart__container').findComponent({ name: 'Line' }).exists()).toBe(true)
    expect(box.getComponent({ name: 'Line' }).props('options')).toMatchObject({
      responsive: true,
      maintainAspectRatio: false,
    })
    await wrapper.setProps({ trends: [] })
    expect(wrapper.get('.trend-chart').element).toBe(box.element)
    expect(box.get('.trend-chart__empty').text()).toBe('No data')
    wrapper.unmount()
  })

  it('uses line legend swatches, hover-only markers and a guarded gradient fill', () => {
    const wrapper = mount(TrendChart, {
      props: { trends: [{ date: '2026-11-14', created: 2, completed: 1 }] },
    })
    const line = wrapper.findComponent({ name: 'Line' })
    const [created, completed] = line.props('data').datasets
    const theme = getChartTheme()
    expect(line.props('options').plugins.legend.labels).toMatchObject({
      usePointStyle: true,
      pointStyle: 'line',
      pointStyleWidth: 32,
    })
    expect(created).toMatchObject({ borderColor: theme.primary, fill: 'origin', borderDash: [] })
    expect(completed).toMatchObject({
      borderColor: theme.completed, fill: false, borderDash: [5, 5],
    })
    const swatches = line.props('options').plugins.legend.labels.generateLabels({
      data: line.props('data'),
      isDatasetVisible: (index) => index === 0,
    })
    expect(swatches).toMatchObject([
      { text: 'Created', pointStyle: 'line', lineDash: [], hidden: false, datasetIndex: 0 },
      { text: 'Completed', pointStyle: 'line', lineDash: [5, 5], hidden: true, datasetIndex: 1 },
    ])
    for (const dataset of [created, completed]) {
      expect(dataset.pointRadius).toBe(0)
      expect(dataset.pointHoverRadius).toBeGreaterThan(0)
    }
    expect(created.backgroundColor()).toBe(theme.area)
    expect(created.backgroundColor({ chart: { ctx: null } })).toBe(theme.area)
    const gradient = { addColorStop: vi.fn() }
    const ctx = { createLinearGradient: vi.fn(() => gradient) }
    expect(created.backgroundColor({ chart: { ctx } })).toBe(theme.area)
    expect(created.backgroundColor({ chart: { ctx, chartArea: { top: 10, bottom: 100 } } }))
      .toBe(gradient)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 10, 0, 100)
    expect(gradient.addColorStop.mock.calls).toEqual([[0, theme.area], [1, theme.surface]])
  })

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
