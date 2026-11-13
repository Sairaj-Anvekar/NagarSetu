import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkerHistoryView from '../WorkerHistoryView.vue'
import EmptyState from '../../components/EmptyState.vue'
import { fetchMyHistory } from '../../api/workerApi'
import { formatDateTime } from '../../utils/formatDate'

vi.mock('../../api/workerApi', () => ({
  fetchMyHistory: vi.fn(),
}))

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
    resolved_at: '2026-11-10T09:15:00.000Z',
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
    resolved_at: '2026-11-09T12:30:00.000Z',
  },
]

describe('WorkerHistoryView - Basic States, Header, Error/Retry and Photo Fallback', () => {
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

  it('renders completed tasks in order with tracking code, category, Completed badge, time, and plural subtitle', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 2,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('2 completed tasks')
    const cards = wrapper.findAll('.worker-history-card')
    expect(cards).toHaveLength(2)

    expect(cards[0].text()).toContain('GRV-2026-H101')
    expect(cards[0].get('h2').text()).toBe('Sanitation')
    expect(cards[0].get('.ns-badge--completed').text()).toBe('Completed')
    expect(cards[0].text()).toContain('Completed')
    expect(cards[0].text()).toContain(formatDateTime('2026-11-10T09:15:00.000Z'))
    expect(cards[0].find('.worker-history-card__description').text()).toBe(
      'Cleared overflowing bin near school gate.',
    )

    expect(cards[1].text()).toContain('GRV-2026-H102')
    expect(cards[1].get('h2').text()).toBe('Drainage')
    expect(cards[1].find('.worker-history-card__description').exists()).toBe(false)
  })

  it('uses singular subtitle "1 completed task" when total is 1', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: [mockHistoryItems[0]],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('1 completed task')
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
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('0 completed tasks')
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
    expect(wrapper.findAll('.worker-history-card')).toHaveLength(1)
  })

  it('renders photo thumbnail with alt text and falls back to neutral placeholder on error', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 2,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    const cards = wrapper.findAll('.worker-history-card')
    const img = cards[0].get('img')
    expect(img.attributes('src')).toBe('https://example.com/signed-photo-1.jpg')
    expect(img.attributes('alt')).toContain('Sanitation')
    expect(cards[1].find('img').exists()).toBe(false)

    await img.trigger('error')
    expect(cards[0].find('img').exists()).toBe(false)
    expect(cards[0].get('.worker-history-card__thumb-placeholder').text()).toBe('No photo')
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
    expect(wrapper.text()).not.toContain('+919988776655')
  })

  it('shows Load more when total exceeds loaded items and appends page 2 without duplicates', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 3,
      page: 1,
      pageSize: 2,
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
        mockHistoryItems[1],
        {
          ...mockHistoryItems[1],
          id: 'h-3',
          tracking_code: 'GRV-2026-H103',
          category: 'Roads',
          resolved_at: '2026-11-08T08:00:00.000Z',
        },
      ],
      total: 3,
      page: 2,
      pageSize: 2,
    })
    await flushPromises()

    const codes = wrapper
      .findAll('.worker-history-card__tracking')
      .map((el) => el.text())
    expect(codes).toEqual(['GRV-2026-H101', 'GRV-2026-H102', 'GRV-2026-H103'])
    expect(wrapper.find('.worker-history-load-more-btn').exists()).toBe(false)
  })

  it('shows inline error with Retry when Load more fails without clearing existing rows', async () => {
    fetchMyHistory.mockResolvedValueOnce({
      items: mockHistoryItems,
      total: 3,
      page: 1,
      pageSize: 2,
    })

    const wrapper = mount(WorkerHistoryView)
    await flushPromises()

    fetchMyHistory.mockRejectedValueOnce({ response: { status: 500 } })
    await wrapper.get('.worker-history-load-more-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.worker-history-card')).toHaveLength(2)
    const inlineAlert = wrapper.get('.worker-history-more [role="alert"]')
    expect(inlineAlert.text()).toContain('Server error. Please try again later.')

    fetchMyHistory.mockResolvedValueOnce({
      items: [
        {
          ...mockHistoryItems[1],
          id: 'h-3',
          tracking_code: 'GRV-2026-H103',
          category: 'Roads',
        },
      ],
      total: 3,
      page: 2,
      pageSize: 2,
    })

    await inlineAlert.get('.worker-history-retry-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.worker-history-more [role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.worker-history-card')).toHaveLength(3)
  })
})

