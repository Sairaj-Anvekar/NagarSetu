import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import WorkerView from '../WorkerView.vue'
import WorkerTaskCard from '../../components/worker/WorkerTaskCard.vue'
import WorkerHeader from '../../components/worker/WorkerHeader.vue'
import TaskSummaryStrip from '../../components/worker/TaskSummaryStrip.vue'
import TaskFilterChips from '../../components/worker/TaskFilterChips.vue'
import EmptyState from '../../components/EmptyState.vue'
import { fetchMyTasks } from '../../api/workerApi'
import { saveAuth } from '../../utils/authStorage'

// Fixed anchor: 2026-11-01T10:00:00.000Z
// mockTasks has October deadlines for t-1/t-2 (overdue) and November 5-7 for t-3/t-4/t-5 (not overdue)
const NOW = new Date('2026-11-01T10:00:00.000Z').getTime()

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
  let pinia

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('shows centered role="status" spinner and no cards while the first call is pending', async () => {
    fetchMyTasks.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await nextTick()

    const spinner = wrapper.find('[role="status"]')
    expect(spinner.exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading your tasks...')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(0)
  })

  it('renders cards in EXACTLY the order received and displays counts in summary strip', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

    const strip = wrapper.getComponent(TaskSummaryStrip)
    expect(strip.find('[data-testid="strip-submitted"]').text()).toContain('4')
    expect(strip.find('[data-testid="strip-in-progress"]').text()).toContain('1')
    expect(strip.find('[data-testid="strip-overdue"]').text()).toContain('2')
  })

  it('displays singular 1 task in summary strip when only one non-overdue task is present', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: [mockTasks[2]], // In-Progress, not overdue
      total: 1,
      page: 1,
      page_size: 1,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    const strip = wrapper.getComponent(TaskSummaryStrip)
    expect(strip.find('[data-testid="strip-submitted"]').text()).toContain('0')
    expect(strip.find('[data-testid="strip-in-progress"]').text()).toContain('1')
    expect(strip.find('[data-testid="strip-overdue"]').text()).toContain('0')
  })

  it('shows "No tasks right now" empty state when list is empty', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 0,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No tasks right now')
    expect(empty.get('p').text()).toBe('New complaints assigned to you will appear here.')
  })
})

describe('WorkerView - Error Handling, Refresh, Race Conditions, and Cleanup', () => {
  let pinia

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('shows error alert on 500 error, hides cards, and retries when "Try again" is clicked', async () => {
    fetchMyTasks.mockRejectedValueOnce({ response: { status: 500 } })
    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
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

describe('WorkerView - Redesign Extensions (W3)', () => {
  let pinia

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders greeting header with worker name and department/zone chip when available', async () => {
    saveAuth({
      token: 'test-token',
      role: 'worker',
      user: {
        id: '101',
        name: 'Ravi Patil',
        department: 'Solid Waste Management',
        zone: 'Zone A',
      },
    })

    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    const header = wrapper.getComponent(WorkerHeader)
    expect(header.props('variant')).toBe('greeting')
    expect(header.props('name')).toBe('Ravi Patil')
    expect(header.props('chip')).toBe('Solid Waste Management · Zone A')
    expect(header.text()).toContain('Ravi Patil')
    expect(header.text()).toContain('Solid Waste Management · Zone A')
  })

  it('omits department/zone chip when user lacks department or zone', async () => {
    saveAuth({
      token: 'test-token',
      role: 'worker',
      user: {
        id: '101',
        name: 'Ravi Patil',
      },
    })

    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    const header = wrapper.getComponent(WorkerHeader)
    expect(header.props('chip')).toBe('')
    expect(header.find('.ns-worker-header__chip').exists()).toBe(false)
  })

  it('filters cards by chip selection: Submitted, In-Progress, and Overdue', async () => {
    fetchMyTasks.mockResolvedValueOnce({
      items: mockTasks,
      total: 5,
      page: 1,
      page_size: 5,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    // Default 'all' shows all 5
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(5)

    const filterChips = wrapper.getComponent(TaskFilterChips)
    const chips = filterChips.findAll('button')

    // Click 'Submitted'
    await chips[1].trigger('click')
    await flushPromises()
    expect(wrapper.vm.selectedFilter).toBe('Submitted')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(4)

    // Click 'In-Progress'
    await chips[2].trigger('click')
    await flushPromises()
    expect(wrapper.vm.selectedFilter).toBe('In-Progress')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(1)
    expect(wrapper.findComponent(WorkerTaskCard).props('task').tracking_code).toBe('GRV-2026-B2K9')

    // Click 'Overdue'
    await chips[3].trigger('click')
    await flushPromises()
    expect(wrapper.vm.selectedFilter).toBe('overdue')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(2)
  })

  it('shows "No tasks in this filter" empty state and "Show all" resets filter', async () => {
    // Only 1 In-Progress task
    fetchMyTasks.mockResolvedValueOnce({
      items: [mockTasks[2]], // In-Progress, not overdue
      total: 1,
      page: 1,
      page_size: 1,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(1)

    // Select 'Submitted' chip which has 0 matches
    const filterChips = wrapper.getComponent(TaskFilterChips)
    const chips = filterChips.findAll('button')
    await chips[1].trigger('click') // Submitted
    await flushPromises()

    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(0)
    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No tasks in this filter')
    expect(empty.get('p').text()).toContain('Try selecting another filter')

    // Click 'Show all' button inside EmptyState
    const showAllBtn = empty.get('.worker-show-all-btn')
    await showAllBtn.trigger('click')
    await flushPromises()

    expect(wrapper.vm.selectedFilter).toBe('all')
    expect(wrapper.findAllComponents(WorkerTaskCard).length).toBe(1)
  })

  it('defensively omits Completed tasks from active list and summary counts', async () => {
    const tasksWithCompleted = [
      ...mockTasks,
      {
        id: 't-completed',
        tracking_code: 'GRV-2026-CMPL',
        category: 'Sanitation',
        status: 'Completed',
        priority: 'high',
        sla_deadline: '2026-10-15T10:00:00.000Z',
        is_overdue: true,
      },
    ]

    fetchMyTasks.mockResolvedValueOnce({
      items: tasksWithCompleted,
      total: 6,
      page: 1,
      page_size: 6,
    })

    const wrapper = mount(WorkerView, {
      props: { now: NOW },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    // Completed task should not appear in cards
    const cards = wrapper.findAllComponents(WorkerTaskCard)
    expect(cards.length).toBe(5)
    expect(cards.some((c) => c.props('task').status === 'Completed')).toBe(false)

    // Summary strip counts should ignore the completed task
    const strip = wrapper.getComponent(TaskSummaryStrip)
    expect(strip.find('[data-testid="strip-overdue"]').text()).toContain('2')
  })
})
