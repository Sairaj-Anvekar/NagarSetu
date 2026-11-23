import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkerHistoryView from '../WorkerHistoryView.vue'
import EmptyState from '../../components/EmptyState.vue'
import HistorySegmentedControl from '../../components/worker/HistorySegmentedControl.vue'
import { fetchMyHistory } from '../../api/workerApi'
import { formatCompletionTime } from '../../utils/historyGroups'

vi.mock('../../api/workerApi', () => ({
  fetchMyHistory: vi.fn(),
}))

// Current reference dates for testing
const now = new Date()
const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15).toISOString()
const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 11, 30)
const yesterdayIso = yesterdayDate.toISOString()

const mockHistoryItems = [
  {
    id: 'h-1',
    tracking_code: 'GRV-2026-H101',
    category: 'Sanitation',
    description: 'Cleared overflowing bin near school gate.',
    image_url: 'https://example.com/signed-photo-1.jpg',
    latitude: 17.6805,
    longitude: 75.8812,
    priority: 'high',
    status: 'Completed',
    sla_deadline: '2026-11-10T10:00:00.000Z',
    is_overdue: false,
    resolved_at: todayIso,
    zone: 'Zone A',
  },
  {
    id: 'h-2',
    tracking_code: 'GRV-2026-H102',
    category: 'Drainage',
    description: null,
    image_url: null,
    latitude: 17.6911,
    longitude: 75.8923,
    priority: 'medium',
    status: 'Completed',
    sla_deadline: '2026-11-09T14:00:00.000Z',
    is_overdue: false,
    resolved_at: yesterdayIso,
    zone: 'Zone B',
  },
]

describe('WorkerHistoryView - Basic States, Header, Error/Retry and Groups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows centered loading spinner while the first page is pending', async () => {
    fetchMyHistory.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(WorkerHistoryView)
    await nextTick()

    expect(fetchMyHistory).toHaveBeenCalledWith({ page: 1 })
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading your completed tasks...')
    expect(wrapper.findAll('.worker-history-card')).toHaveLength(0)
  })

  it('renders completed tasks with WorkerHeader, segmented control, day groups, tracking code and check badges', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 2,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    expect(wrapper.get('.ns-worker-header__title').text()).toBe('History')
    expect(wrapper.get('.ns-worker-header__subtitle').text()).toBe('Tasks you have completed')

    expect(wrapper.findComponent(HistorySegmentedControl).exists()).toBe(true)

    const cards = wrapper.findAll('.worker-history-card')
    expect(cards.length).toBeGreaterThanOrEqual(1)

    expect(wrapper.text()).toContain('GRV-2026-H101')
    expect(wrapper.text()).toContain('Sanitation')
    expect(wrapper.text()).toContain(formatCompletionTime(todayIso))
    expect(wrapper.findAll('.worker-history-card__badge').length).toBeGreaterThanOrEqual(1)
  })

  it('shows EmptyState when there are no completed tasks', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No completed tasks yet')
  })

  it('shows 403 ErrorAlert with Retry button and refetches on click', async () => {
    fetchMyHistory.mockRejectedValueOnce({ response: { status: 403 } })
    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    const alert = wrapper.get('.alert-danger')
    expect(alert.text()).toContain('You do not have permission to do this.')

    fetchMyHistory.mockResolvedValueOnce({
      items: [mockHistoryItems[0]],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    await alert.get('button').trigger('click')
    await flushPromises()

    expect(fetchMyHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.alert-danger').exists()).toBe(false)
    expect(wrapper.findAll('.worker-history-card').length).toBe(1)
  })

  it('switches between This week and This month via segmented control', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 2,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    const segmented = wrapper.getComponent(HistorySegmentedControl)
    expect(wrapper.vm.selectedPeriod).toBe('week')

    await segmented.findAll('button')[1].trigger('click')
    expect(wrapper.vm.selectedPeriod).toBe('month')
  })
})

describe('WorkerHistoryView - Pagination, Non-clickable Rows and Privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('never renders links, raw coordinates, or citizen personal info', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: [
        {
          ...mockHistoryItems[0],
          citizen_name: 'Asha Kulkarni',
          citizen_phone: '+919988776655',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.find('.worker-history-load-more-btn').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('17.6805')
    expect(wrapper.text()).not.toContain('75.8812')
    expect(wrapper.text()).not.toContain('Asha Kulkarni')
    expect(wrapper.text()).not.toContain('+919876543210')
  })

  it('shows Load more when total exceeds loaded items and appends page 2 without duplicates', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: [mockHistoryItems[0]],
      total: 2,
      page: 1,
      pageSize: 1,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    const loadMoreBtn = wrapper.get('.worker-history-load-more-btn')
    expect(loadMoreBtn.text()).toContain('Load more')

    let resolvePage2
    fetchMyHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePage2 = resolve
      }),
    )

    await loadMoreBtn.trigger('click')
    await nextTick()

    expect(fetchMyHistory).toHaveBeenNthCalledWith(2, { page: 2 })
    expect(loadMoreBtn.attributes('disabled')).toBeDefined()
    expect(loadMoreBtn.text()).toContain('Loading more...')

    resolvePage2({
      items: [
        mockHistoryItems[0],
        {
          ...mockHistoryItems[1],
          id: 'h-3',
          tracking_code: 'GRV-2026-H103',
          category: 'Roads',
          resolved_at: todayIso,
        },
      ],
      total: 2,
      page: 2,
      pageSize: 1,
    })
    await flushPromises()

    const codes = wrapper
      .findAll('.worker-history-card__tracking')
      .map((el) => el.text())
    expect(codes).toContain('GRV-2026-H101')
    expect(codes).toContain('GRV-2026-H103')
    expect(wrapper.find('.worker-history-load-more-btn').exists()).toBe(false)
  })

  it('shows inline error with Retry when Load more fails without clearing existing rows', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: [mockHistoryItems[0]],
      total: 2,
      page: 1,
      pageSize: 1,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    fetchMyHistory.mockRejectedValueOnce({ response: { status: 500 } })
    await wrapper.get('.worker-history-load-more-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.worker-history-card')).toHaveLength(1)
    const inlineAlert = wrapper.get('.worker-history-more [role="alert"]')
    expect(inlineAlert.text()).toContain('Server error. Please try again later.')

    fetchMyHistory.mockResolvedValueOnce({
      items: [
        {
          ...mockHistoryItems[1],
          id: 'h-3',
          tracking_code: 'GRV-2026-H103',
          category: 'Roads',
          resolved_at: todayIso,
        },
      ],
      total: 2,
      page: 2,
      pageSize: 1,
    })

    await inlineAlert.get('.worker-history-retry-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.worker-history-more [role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.worker-history-card')).toHaveLength(2)
  })
})
