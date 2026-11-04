import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkerView from '../WorkerView.vue'
import WorkerTaskCard from '../../components/worker/WorkerTaskCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { fetchMyTasks } from '../../api/workerApi'

vi.mock('../../api/workerApi', () => ({
  fetchMyTasks: vi.fn(),
}))

const mockTasks = [
  {
    id: 't-1',
    tracking_code: 'GRV-2026-A7X3',
    category: 'Roads',
    description: 'Pothole on main road.',
    latitude: 19.076,
    longitude: 72.8777,
    priority: 'high',
    status: 'Submitted',
    sla_deadline: '2026-10-20T10:00:00.000Z',
    is_overdue: true,
  },
  {
    id: 't-2',
    tracking_code: 'GRV-2026-E1Q7',
    category: 'Sanitation',
    description: 'Garbage dump near gate.',
    latitude: 19.077,
    longitude: 72.878,
    priority: 'low',
    status: 'Submitted',
    sla_deadline: '2026-10-21T10:00:00.000Z',
    is_overdue: true,
  },
  {
    id: 't-3',
    tracking_code: 'GRV-2026-B2K9',
    category: 'Drainage',
    description: 'Blocked drain.',
    latitude: 19.078,
    longitude: 72.879,
    priority: 'critical',
    status: 'In-Progress',
    sla_deadline: '2026-11-05T10:00:00.000Z',
    is_overdue: false,
  },
  {
    id: 't-4',
    tracking_code: 'GRV-2026-C5M1',
    category: 'Water',
    description: 'Pipe leaking.',
    latitude: 19.079,
    longitude: 72.88,
    priority: 'medium',
    status: 'Submitted',
    sla_deadline: '2026-11-06T10:00:00.000Z',
    is_overdue: false,
  },
  {
    id: 't-5',
    tracking_code: 'GRV-2026-D8P4',
    category: 'Electrical',
    description: 'Streetlight pole issue.',
    latitude: 19.08,
    longitude: 72.881,
    priority: 'low',
    status: 'Submitted',
    sla_deadline: '2026-11-07T10:00:00.000Z',
    is_overdue: false,
  },
]

describe('WorkerView - Loading, Ordering, Subtitles and Empty State', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows centered role="status" spinner and no cards while the first call is pending', async () => {
    fetchMyTasks.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(WorkerView)
    await nextTick()

    const spinner = wrapper.find('[role="status"]')
    expect(spinner.exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading your tasks...')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(0)
  })

  it('renders cards in EXACTLY the order received and displays "5 tasks · 2 overdue"', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView)
    await flushPromises()

    const cards = wrapper.findAllComponents(WorkerTaskCard)
    expect(cards.length).toBe(5)

    const trackingCodes = cards.map((c) => c.props('task').tracking_code)
    expect(trackingCodes).toEqual([
      'GRV-2026-A7X3',
      'GRV-2026-E1Q7',
      'GRV-2026-B2K9',
      'GRV-2026-C5M1',
      'GRV-2026-D8P4',
    ])

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('5 tasks · 2 overdue')
  })

  it('displays singular "1 task" without overdue part when only one non-overdue task is present', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: [mockTasks[2]],
      total: 1,
      page: 1,
      page_size: 1,
    })

    const wrapper = mount(WorkerView)
    await flushPromises()

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('1 task')
  })

  it('shows "No tasks assigned" empty state and "No tasks right now." when list is empty', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 0,
    })

    const wrapper = mount(WorkerView)
    await flushPromises()

    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No tasks assigned')
    expect(empty.get('p').text()).toBe('New complaints assigned to you will appear here.')
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('No tasks right now.')
  })
})

describe('WorkerView - Error Handling, Refresh, Race Conditions, and Cleanup', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows error alert on 500 error, hides cards, and retries when "Try again" is clicked', async () => {
    fetchMyTasks.mockRejectedValueOnce({ response: { status: 500 } })
    const wrapper = mount(WorkerView)
    await flushPromises()

    const alert = wrapper.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.find('.alert-heading').text()).toBe('Could not load tasks')
    expect(alert.text()).toContain('Server error. Please try again later.')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(0)

    // Now mock success for retry
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const tryAgainBtn = alert.find('button')
    expect(tryAgainBtn.text()).toBe('Try again')
    await tryAgainBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.alert-danger').exists()).toBe(false)
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(5)
  })

  it('disables Refresh button while call is pending and re-fetches when clicked', async () => {
    let resolveCall
    fetchMyTasks.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )

    const wrapper = mount(WorkerView)
    await nextTick()

    const refreshBtn = wrapper.find('.worker-refresh-btn')
    expect(refreshBtn.attributes('disabled')).toBeDefined()

    resolveCall({
      items: [mockTasks[0]],
      total: 1,
      page: 1,
      page_size: 1,
    })
    await flushPromises()

    expect(refreshBtn.attributes('disabled')).toBeUndefined()

    // Trigger refresh
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })
    await refreshBtn.trigger('click')
    await flushPromises()

    expect(fetchMyTasks).toHaveBeenCalledTimes(2)
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(5)
  })

  it('keeps previously loaded cards and displays error alert when refresh fails', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView)
    await flushPromises()

    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(5)

    // Mock refresh failure
    fetchMyTasks.mockRejectedValueOnce({ response: { status: 500 } })

    const refreshBtn = wrapper.find('.worker-refresh-btn')
    await refreshBtn.trigger('click')
    await flushPromises()

    const alert = wrapper.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.find('.alert-heading').text()).toBe('Could not load tasks')
    // Previously loaded cards must still be rendered underneath
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(5)
  })

  it('ignores stale responses when calls overlap and the first resolves after the second', async () => {
    let resolveFirst
    let resolveSecond

    const promise1 = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const promise2 = new Promise((resolve) => {
      resolveSecond = resolve
    })

    fetchMyTasks.mockReturnValueOnce(promise1)

    const wrapper = mount(WorkerView)
    await nextTick()

    fetchMyTasks.mockReturnValueOnce(promise2)
    wrapper.vm.loadTasks()

    // Resolve second request first with 1 item
    resolveSecond({
      items: [mockTasks[0]],
      total: 1,
      page: 1,
      page_size: 1,
    })
    await flushPromises()

    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(1)
    expect(wrapper.findComponent(WorkerTaskCard).props('task').tracking_code).toBe('GRV-2026-A7X3')

    // Stale first request resolves later with 5 items
    resolveFirst({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })
    await flushPromises()

    // Stale request must be ignored; still 1 card
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(1)
    expect(wrapper.findComponent(WorkerTaskCard).props('task').tracking_code).toBe('GRV-2026-A7X3')
  })

  it('does not throw when an API response arrives after the component is unmounted', async () => {
    let resolveCall
    fetchMyTasks.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )

    const wrapper = mount(WorkerView)
    await nextTick()

    wrapper.unmount()

    expect(() => {
      resolveCall({
        items: mockTasks,
        total: 5,
        page: 1,
        page_size: 5,
      })
    }).not.toThrow()
    await flushPromises()
  })
})
