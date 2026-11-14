import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminComplaintDetailView from '../AdminComplaintDetailView.vue'
import { fetchAdminComplaint } from '../../api/adminApi'

vi.mock('../../api/adminApi', () => ({
  fetchAdminComplaint: vi.fn(),
}))

async function mountView(id = 'comp-uuid-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/complaints',
        name: 'admin-complaints',
        component: { template: '<div>Complaints List</div>' },
      },
      {
        path: '/admin/complaints/:id',
        name: 'admin-complaint-detail',
        component: AdminComplaintDetailView,
      },
    ],
  })

  await router.push(`/admin/complaints/${id}`)
  await router.isReady()

  const wrapper = mount(AdminComplaintDetailView, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

describe('AdminComplaintDetailView — Loading, Error, 403 and 404 states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetchAdminComplaint is pending', async () => {
    fetchAdminComplaint.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountView('comp-uuid-1')
    await nextTick()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading complaint...')
  })

  it('shows "Complaint not found" EmptyState on 404 with link to complaints list', async () => {
    fetchAdminComplaint.mockRejectedValueOnce({
      response: { status: 404, data: { detail: 'Complaint not found' } },
    })

    const { wrapper } = await mountView('missing-id')
    await flushPromises()

    expect(wrapper.find('.ns-empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Complaint not found')
    expect(wrapper.text()).toContain(
      'The requested complaint could not be found or belongs to another department.',
    )

    const backLink = wrapper.get('a.back-link')
    expect(backLink.attributes('href')).toBe('/admin/complaints')
    expect(backLink.text()).toBe('Back to complaints')
  })

  it('shows Access Denied ErrorAlert on 403 forbidden response', async () => {
    fetchAdminComplaint.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Forbidden' } },
    })

    const { wrapper } = await mountView('forbidden-id')
    await flushPromises()

    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Access Denied')
    expect(wrapper.text()).toContain('You do not have permission to view this complaint.')
  })

  it('shows generic ErrorAlert with Retry button on server or network error', async () => {
    fetchAdminComplaint.mockRejectedValueOnce({
      request: {},
    })

    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('Could not load complaint')
    expect(wrapper.text()).toContain('Cannot reach the server. Check your connection.')

    const retryBtn = wrapper.get('button')
    expect(retryBtn.text()).toBe('Try again')

    // Retry should re-trigger fetchAdminComplaint
    fetchAdminComplaint.mockResolvedValueOnce({
      id: 'comp-uuid-1',
      tracking_code: 'SAN-1',
    })

    await retryBtn.trigger('click')
    await flushPromises()

    expect(fetchAdminComplaint).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.alert-danger').exists()).toBe(false)
  })

  it('does not crash or update state if unmounted before fetch resolves', async () => {
    let resolvePromise
    fetchAdminComplaint.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res
      }),
    )

    const { wrapper } = await mountView('comp-uuid-1')
    wrapper.unmount()

    resolvePromise({ id: 'comp-uuid-1' })
    await flushPromises()

    expect(wrapper.vm.complaint).toBeNull()
  })
})

describe('AdminComplaintDetailView — Header, Details, Assignment, and History', () => {
  const baseComplaint = {
    id: 'comp-uuid-1',
    tracking_code: 'SAN-20261114-1029',
    category: 'Garbage Dump',
    status: 'In-Progress',
    priority: 'high',
    zone: { id: '1', name: 'Zone A' },
    assigned_worker: { id: '2', name: 'Ramesh Patil' },
    description: 'Overflowing dump near market square',
    sla_deadline: '2026-11-14T18:00:00Z',
    is_overdue: true,
    created_at: '2026-11-14T09:00:00Z',
    resolved_at: null,
    image_url: null,
    latitude: 17.68,
    longitude: 75.88,
    carry_forward_count: 2,
    logs: [
      {
        event_type: 'created',
        actor_type: 'citizen',
        created_at: '2026-11-14T09:00:00Z',
        details: null,
      },
      {
        event_type: 'assigned',
        actor_type: 'admin',
        created_at: '2026-11-14T10:00:00Z',
        details: null,
      },
      {
        event_type: 'deferred',
        actor_type: 'worker',
        created_at: '2026-11-14T14:00:00Z',
        details: null,
      },
    ],
    resolution: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', window.location.href)
  })

  it('renders tracking code in header alongside status and priority badges', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('SAN-20261114-1029')
    expect(wrapper.find('.ns-badge--in-progress').text()).toBe('In-Progress')
    expect(wrapper.find('.ns-badge--high').text()).toBe('High')
  })

  it('triggers router.back() when returning from a complaints list page with history state', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint })
    const { wrapper, router } = await mountView('comp-uuid-1')
    await flushPromises()

    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => {})
    window.history.replaceState(
      { back: '/admin/complaints?status=In-Progress&zone_id=1' },
      '',
      window.location.href,
    )

    const backLink = wrapper.get('a.back-link')
    await backLink.trigger('click')

    expect(backSpy).toHaveBeenCalled()
  })

  it('renders details section with category, zone, timestamps, and description', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Details')
    expect(wrapper.text()).toContain('Garbage Dump')
    expect(wrapper.text()).toContain('Zone A')
    expect(wrapper.text()).toContain('Overflowing dump near market square')
  })

  it('renders "Overdue" text when overdue and not Completed, but hides it when Completed', async () => {
    // Overdue and In-Progress -> Overdue visible
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint, is_overdue: true, status: 'In-Progress' })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Overdue')

    // Overdue but Completed -> Overdue NOT visible
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint, is_overdue: true, status: 'Completed' })
    const { wrapper: completedWrapper } = await mountView('comp-uuid-2')
    await flushPromises()

    expect(completedWrapper.text()).not.toContain('Overdue')
  })

  it('renders assigned worker name and handles "Unassigned" fallback', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...baseComplaint,
      assigned_worker: null,
    })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Assignment')
    expect(wrapper.text()).toContain('Unassigned')
  })

  it('renders "Deferred N times" only when carry_forward_count is greater than 0', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...baseComplaint,
      carry_forward_count: 2,
    })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Deferred 2 times')

    fetchAdminComplaint.mockResolvedValueOnce({
      ...baseComplaint,
      carry_forward_count: 0,
      logs: [],
    })
    const { wrapper: zeroWrapper } = await mountView('comp-uuid-2')
    await flushPromises()

    expect(zeroWrapper.text()).not.toContain('Deferred')
  })

  it('renders chronological status history entries and omits section when logs is empty', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Status history')
    const listItems = wrapper.findAll('.timeline-list li')
    expect(listItems.length).toBe(3)
    expect(listItems[0].text()).toContain('Submitted')
    expect(listItems[0].text()).toContain('by Citizen')
    expect(listItems[1].text()).toContain('Assigned')
    expect(listItems[1].text()).toContain('by Administrator')
    expect(listItems[2].text()).toContain('Deferred')
    expect(listItems[2].text()).toContain('by Worker')

    // Empty logs payload
    fetchAdminComplaint.mockResolvedValueOnce({ ...baseComplaint, logs: [] })
    const { wrapper: emptyLogsWrapper } = await mountView('comp-uuid-2')
    await flushPromises()

    expect(emptyLogsWrapper.find('.timeline-list').exists()).toBe(false)
  })

  it('does not render citizen personal information or raw coordinates as text', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...baseComplaint,
      citizen_phone: '+919876543210',
      telegram_id: 'citizen_tg_123',
    })
    const { wrapper } = await mountView('comp-uuid-1')
    await flushPromises()

    expect(wrapper.text()).not.toContain('17.68')
    expect(wrapper.text()).not.toContain('75.88')
    expect(wrapper.text()).not.toContain('+919876543210')
    expect(wrapper.text()).not.toContain('citizen_tg_123')
  })
})

describe('AdminComplaintDetailView — Resolution section', () => {
  const completedComplaint = {
    id: 'comp-uuid-3',
    tracking_code: 'SAN-20261114-9999',
    category: 'Solid Waste',
    status: 'Completed',
    priority: 'medium',
    sla_deadline: '2026-11-14T18:00:00Z',
    is_overdue: false,
    created_at: '2026-11-14T09:00:00Z',
    resolution: {
      note: 'Debris and garbage cleared from street corner.',
      photo_url: 'https://storage.local/resolved-site.jpg',
      completed_at: '2026-11-14T16:30:00Z',
      worker: { id: '3', name: 'Sunil Jadhav' },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders resolution note, worker name, and evidence photo when status is Completed', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({ ...completedComplaint })
    const { wrapper } = await mountView('comp-uuid-3')
    await flushPromises()

    expect(wrapper.text()).toContain('Resolution')
    expect(wrapper.text()).toContain('Debris and garbage cleared from street corner.')
    expect(wrapper.text()).toContain('Sunil Jadhav')

    const img = wrapper.get('img[alt="Resolution photo"]')
    expect(img.attributes('src')).toBe('https://storage.local/resolved-site.jpg')

    const link = wrapper.get('a.resolution-photo-link')
    expect(link.attributes('href')).toBe('https://storage.local/resolved-site.jpg')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })

  it('does not render resolution section when status is Submitted', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...completedComplaint,
      status: 'Submitted',
    })
    const { wrapper } = await mountView('comp-uuid-3')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Resolution note')
    expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
  })

  it('does not render resolution section when status is In-Progress', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...completedComplaint,
      status: 'In-Progress',
    })
    const { wrapper } = await mountView('comp-uuid-3')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Resolution note')
    expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
  })

  it('renders resolution note without image tag when photo_url is null', async () => {
    fetchAdminComplaint.mockResolvedValueOnce({
      ...completedComplaint,
      resolution: {
        ...completedComplaint.resolution,
        photo_url: null,
      },
    })
    const { wrapper } = await mountView('comp-uuid-3')
    await flushPromises()

    expect(wrapper.text()).toContain('Debris and garbage cleared from street corner.')
    expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
  })
})


