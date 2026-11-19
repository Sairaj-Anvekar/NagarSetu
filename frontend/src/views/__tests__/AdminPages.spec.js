import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminView from '../AdminView.vue'
import EmptyState from '../../components/EmptyState.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import ErrorAlert from '../../components/ErrorAlert.vue'
import * as adminApi from '../../api/adminApi'

vi.mock('../../api/adminApi')
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
  BarElement: {},
  LineElement: {},
  PointElement: {},
  CategoryScale: {},
  LinearScale: {},
}))
vi.mock('vue-chartjs', () => ({
  Bar: { name: 'Bar', template: '<div class="mock-bar" />' },
  Line: { name: 'Line', template: '<div class="mock-line" />' },
}))

describe('AdminView dashboard - state and errors', () => {
  let router
  let dashboard

  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', component: { template: '<div />' } },
        { path: '/admin/complaints', component: { template: '<div />' } },
      ],
    })
    await router.push('/admin')
    await router.isReady()
  })

  function mountDashboard() {
    dashboard = mount(AdminView, { global: { plugins: [router] } })
    return dashboard
  }

  afterEach(() => {
    dashboard?.unmount()
    dashboard = undefined
    vi.restoreAllMocks()
  })

  it('renders Dashboard heading, department subtitle, and empty state when total is 0', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Solid Waste Management' },
      totals: { total: 0, submitted: 0, in_progress: 0, completed: 0, overdue: 0, unassigned: 0 },
      by_category: [],
      by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockResolvedValueOnce([])

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Dashboard')
    expect(wrapper.get('header p').text()).toBe('Solid Waste Management')
    const emptyState = wrapper.getComponent(EmptyState)
    expect(emptyState.get('h3').text()).toBe('No complaints yet')
    expect(emptyState.get('p').text()).toContain('category and zone breakdowns will appear here')
  })

  it('shows LoadingSpinner while stats are loading', () => {
    vi.spyOn(adminApi, 'fetchStats').mockReturnValueOnce(new Promise(() => {}))
    vi.spyOn(adminApi, 'fetchTrends').mockReturnValueOnce(new Promise(() => {}))

    const wrapper = mountDashboard()
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
  })

  it('shows ErrorAlert on stats error and Retry refetches only stats', async () => {
    const statsSpy = vi
      .spyOn(adminApi, 'fetchStats')
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        department: { id: 'd1', name: 'Sanitation' },
        totals: {
          total: 0,
          submitted: 0,
          in_progress: 0,
          completed: 0,
          overdue: 0,
          unassigned: 0,
        },
        by_category: [],
        by_zone: [],
      })
    const trendsSpy = vi.spyOn(adminApi, 'fetchTrends').mockResolvedValue([])

    const wrapper = mountDashboard()
    await flushPromises()

    const alert = wrapper.findComponent(ErrorAlert)
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Network failure')

    const retryBtn = alert.find('button')
    await retryBtn.trigger('click')
    await flushPromises()

    expect(statsSpy).toHaveBeenCalledTimes(2)
    expect(trendsSpy).toHaveBeenCalledTimes(1)
  })

  it('renders the six tiles in the right order with the right numbers', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Solid Waste' },
      totals: {
        total: 50,
        submitted: 15,
        in_progress: 20,
        completed: 15,
        overdue: 5,
        unassigned: 8,
      },
      by_category: [{ category: 'Garbage', count: 50 }],
      by_zone: [{ zone: 'Zone A', count: 50 }],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockResolvedValueOnce([])

    const wrapper = mountDashboard()
    await flushPromises()

    const tiles = wrapper.findAllComponents({ name: 'StatTile' })
    expect(tiles).toHaveLength(6)

    const expectedOrder = [
      { label: 'Total', value: 50 },
      { label: 'Submitted', value: 15 },
      { label: 'In-Progress', value: 20 },
      { label: 'Completed', value: 15 },
      { label: 'Overdue', value: 5 },
      { label: 'Unassigned', value: 8 },
    ]

    expectedOrder.forEach((expected, idx) => {
      expect(tiles[idx].props('label')).toBe(expected.label)
      expect(tiles[idx].props('value')).toBe(expected.value)
    })
  })

  it('does not render Overdue or Unassigned as status badges', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Solid Waste' },
      totals: {
        total: 20,
        submitted: 5,
        in_progress: 5,
        completed: 10,
        overdue: 3,
        unassigned: 2,
      },
      by_category: [],
      by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockResolvedValueOnce([])

    const wrapper = mountDashboard()
    await flushPromises()

    const badges = wrapper.findAll('.ns-badge')
    expect(badges).toHaveLength(0)
    expect(wrapper.find('.ns-badge--overdue').exists()).toBe(false)
    expect(wrapper.find('.ns-badge--unassigned').exists()).toBe(false)
  })

  it('trends error does not hide the tiles or category/zone cards', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Solid Waste' },
      totals: {
        total: 25,
        submitted: 5,
        in_progress: 10,
        completed: 10,
        overdue: 2,
        unassigned: 1,
      },
      by_category: [{ category: 'Solid Waste', count: 25 }],
      by_zone: [{ zone: 'Zone A', count: 25 }],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockRejectedValueOnce(new Error('Trends endpoint 500'))

    const wrapper = mountDashboard()
    await flushPromises()

    const tiles = wrapper.findAllComponents({ name: 'StatTile' })
    expect(tiles).toHaveLength(6)

    expect(wrapper.findComponent({ name: 'CategoryChart' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ZoneBreakdown' }).exists()).toBe(true)

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Trends endpoint 500')
  })

  it('range buttons call fetchTrends with 7, 14, 30 and toggle aria-pressed', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      department: { id: 'd1', name: 'Solid Waste' },
      totals: {
        total: 30,
        submitted: 10,
        in_progress: 10,
        completed: 10,
        overdue: 0,
        unassigned: 0,
      },
      by_category: [{ category: 'Garbage', count: 30 }],
      by_zone: [{ zone: 'Zone A', count: 30 }],
    })
    const trendsSpy = vi.spyOn(adminApi, 'fetchTrends').mockResolvedValue([])

    const wrapper = mountDashboard()
    await flushPromises()

    const rangeButtons = wrapper.findAll('.range-btn')
    expect(rangeButtons).toHaveLength(3)

    expect(rangeButtons[0].attributes('aria-pressed')).toBe('false')
    expect(rangeButtons[1].attributes('aria-pressed')).toBe('true')
    expect(rangeButtons[2].attributes('aria-pressed')).toBe('false')

    await rangeButtons[0].trigger('click')
    await flushPromises()
    expect(trendsSpy).toHaveBeenCalledWith({ days: 7 })
    expect(rangeButtons[0].attributes('aria-pressed')).toBe('true')
    expect(rangeButtons[1].attributes('aria-pressed')).toBe('false')

    await rangeButtons[2].trigger('click')
    await flushPromises()
    expect(trendsSpy).toHaveBeenCalledWith({ days: 30 })
    expect(rangeButtons[2].attributes('aria-pressed')).toBe('true')
    expect(rangeButtons[0].attributes('aria-pressed')).toBe('false')
  })

  it('renders the segmented range group and keeps exactly one selection after each refetch', async () => {
    const statsSpy = vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      totals: { total: 1, submitted: 1, in_progress: 0, completed: 0, overdue: 0, unassigned: 0 },
      by_category: [],
      by_zone: [],
    })
    const trendsSpy = vi.spyOn(adminApi, 'fetchTrends').mockResolvedValue([])
    const wrapper = mountDashboard()
    await flushPromises()
    const group = wrapper.get('.trend-range')
    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBe('Trend duration range')
    expect(group.findAll('button').map((button) => button.text())).toEqual([
      '7 days', '14 days', '30 days',
    ])
    expect(group.get('[aria-pressed="true"]').text()).toBe('14 days')
    trendsSpy.mockClear()
    for (const [index, days] of [7, 14, 30].entries()) {
      await group.findAll('button')[index].trigger('click')
      await flushPromises()
      expect(group.findAll('[aria-pressed="true"]')).toHaveLength(1)
      expect(group.get('[aria-pressed="true"]').text()).toBe(`${days} days`)
      expect(trendsSpy).toHaveBeenNthCalledWith(index + 1, { days })
    }
    expect(trendsSpy).toHaveBeenCalledTimes(3)
    expect(statsSpy).toHaveBeenCalledTimes(1)
  })

  it('Refresh button refetches both stats and trends', async () => {
    const statsSpy = vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      department: { id: 'd1', name: 'Solid Waste' },
      totals: { total: 10, submitted: 5, in_progress: 3, completed: 2, overdue: 0, unassigned: 0 },
      by_category: [{ category: 'Garbage', count: 10 }],
      by_zone: [{ zone: 'Zone A', count: 10 }],
    })
    const trendsSpy = vi.spyOn(adminApi, 'fetchTrends').mockResolvedValue([])

    const wrapper = mountDashboard()
    await flushPromises()

    expect(statsSpy).toHaveBeenCalledTimes(1)
    expect(trendsSpy).toHaveBeenCalledTimes(1)

    const refreshBtn = wrapper.find('.refresh-btn')
    await refreshBtn.trigger('click')
    await flushPromises()

    expect(statsSpy).toHaveBeenCalledTimes(2)
    expect(trendsSpy).toHaveBeenCalledTimes(2)
  })

  it('connects all tiles to filters and derives captions from the displayed totals', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      totals: { total: 10, submitted: 2, in_progress: 3, completed: 5, overdue: 1, unassigned: 2 },
      by_category: [], by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockResolvedValueOnce([])
    const wrapper = mountDashboard()
    await flushPromises()
    const tiles = wrapper.findAll('.stat-tile')
    expect(tiles.map((tile) => tile.attributes('href'))).toEqual([
      '/admin/complaints',
      '/admin/complaints?status=Submitted',
      '/admin/complaints?status=In-Progress',
      '/admin/complaints?status=Completed',
      '/admin/complaints?overdue=true',
      '/admin/complaints?unassigned=true',
    ])
    expect(tiles.slice(1).map((tile) => tile.get('.stat-tile__hint').text())).toEqual([
      '20% of total', '30% of total', '50% of total', 'Needs attention', 'Needs attention',
    ])
    expect(wrapper.findAll('.stat-tile--attention')).toHaveLength(2)
    const strip = wrapper.get('.attention-strip')
    expect(strip.text()).toContain('1 complaint is overdue')
    expect(strip.text()).toContain('2 complaints are unassigned')
    expect(strip.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/admin/complaints?overdue=true', '/admin/complaints?unassigned=true',
    ])
  })

  it('hides percentages and attention messages when all totals are zero', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      totals: { total: 0, submitted: 0, in_progress: 0, completed: 0, overdue: 0, unassigned: 0 },
      by_category: [], by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchTrends').mockResolvedValueOnce([])
    const wrapper = mountDashboard()
    await flushPromises()
    expect(wrapper.find('.attention-strip').exists()).toBe(false)
    expect(wrapper.findAll('.stat-tile--attention')).toHaveLength(0)
    expect(wrapper.findAll('.stat-tile__hint').map((hint) => hint.text())).toEqual([
      'All clear', 'All clear',
    ])
    expect(wrapper.findAll('.stat-tile__value').map((value) => value.text())).toEqual([
      '0', '0', '0', '0', '0', '0',
    ])
  })
})
