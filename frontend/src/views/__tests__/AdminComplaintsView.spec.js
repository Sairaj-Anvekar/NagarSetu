import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount as baseMount, RouterLinkStub } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminComplaintsView from '../AdminComplaintsView.vue'
import ComplaintFilters from '../../components/admin/ComplaintFilters.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import ErrorAlert from '../../components/ErrorAlert.vue'
import EmptyState from '../../components/EmptyState.vue'
import * as adminApi from '../../api/adminApi'
import * as referenceApi from '../../api/referenceApi'
import { downloadBlob, buildComplaintsCsvFilename } from '../../utils/downloadBlob'

vi.mock('../../api/adminApi')
vi.mock('../../api/referenceApi')
vi.mock('../../utils/downloadBlob', () => ({
  downloadBlob: vi.fn(),
  buildComplaintsCsvFilename: vi.fn(() => 'complaints-2026-11-14.csv'),
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/complaints',
        name: 'admin-complaints',
        component: AdminComplaintsView,
      },
    ],
  })
}

async function mountView(initialQuery = {}) {
  const router = createTestRouter()
  const queryString = new URLSearchParams(initialQuery).toString()
  const initialPath = queryString ? `/admin/complaints?${queryString}` : '/admin/complaints'
  await router.push(initialPath)
  await router.isReady()

  const wrapper = baseMount(AdminComplaintsView, {
    global: {
      plugins: [router],
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })
  return { wrapper, router }
}

describe('AdminComplaintsView — initial loading, errors, and empty states', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [{ category: 'Garbage Dump', count: 5 }],
      by_zone: [],
    })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([
      { id: '1', name: 'Zone A' },
      { id: '2', name: 'Zone B' },
    ])
  })

  it('shows loading spinner and "Loading..." subtitle while initial fetch is pending', async () => {
    let resolveComplaints
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveComplaints = resolve
        }),
    )

    const { wrapper } = await mountView()

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
    expect(wrapper.find('header p').text()).toBe('Loading...')

    resolveComplaints({ items: [], total: 0, page: 1, pageSize: 20 })
    await flushPromises()

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(false)
  })

  it('shows total count in subtitle formatted as singular for 1 complaint and plural for 5', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [
        {
          id: '1',
          tracking_code: 'SAN-001',
          category: 'Garbage Dump',
          status: 'Submitted',
          priority: 'high',
          zone: { id: '1', name: 'Zone A' },
          assigned_worker: null,
          sla_deadline: '2026-11-20T10:00:00Z',
          is_overdue: false,
          created_at: '2026-11-14T09:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.find('header p').text()).toBe('1 complaint')

    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [],
      total: 5,
      page: 1,
      pageSize: 20,
    })

    await wrapper.vm.loadComplaints()
    await flushPromises()

    expect(wrapper.find('header p').text()).toBe('5 complaints')
  })

  it('renders ErrorAlert with retry button on failure, and refetches when retry is clicked', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockRejectedValueOnce(
      new Error('Failed to load complaints.'),
    )

    const { wrapper } = await mountView()
    await flushPromises()

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Failed to load complaints.')

    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    const retryButton = errorAlert.find('button')
    expect(retryButton.exists()).toBe(true)
    await retryButton.trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(ErrorAlert).exists()).toBe(false)
    expect(adminApi.fetchAdminComplaints).toHaveBeenCalledTimes(2)
  })

  it('shows "No complaints yet" EmptyState when list is empty and no filters are active', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    const emptyState = wrapper.findComponent(EmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No complaints yet')
    expect(emptyState.text()).toContain('Complaints for your department will appear here.')
    expect(emptyState.find('button').exists()).toBe(false)
  })

  it('shows "No complaints match these filters" EmptyState with Clear filters button when filters are active', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView({ status: 'Completed' })
    await flushPromises()

    const emptyState = wrapper.findComponent(EmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No complaints match these filters')

    const clearBtn = emptyState.find('button')
    expect(clearBtn.exists()).toBe(true)
    expect(clearBtn.text()).toBe('Clear filters')

    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    await clearBtn.trigger('click')
    await flushPromises()

    expect(adminApi.fetchAdminComplaints).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: '',
        page: 1,
      }),
    )
  })
})

describe('AdminComplaintsView — table columns, links, badges, and pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [{ category: 'Garbage Dump', count: 5 }],
      by_zone: [],
    })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([
      { id: '1', name: 'Zone A' },
      { id: '2', name: 'Zone B' },
    ])
  })

  const sampleItems = [
    {
      id: '101',
      tracking_code: 'SAN-101',
      category: 'Garbage Dump',
      status: 'Submitted',
      priority: 'critical',
      zone: { id: '1', name: 'Zone A' },
      assigned_worker: { id: 'w1', name: 'Ravi Patil' },
      sla_deadline: '2026-11-10T10:00:00Z',
      is_overdue: true,
      created_at: '2026-11-09T08:00:00Z',
    },
    {
      id: '102',
      tracking_code: 'SAN-102',
      category: 'Dead Animal',
      status: 'In-Progress',
      priority: 'medium',
      zone: null,
      assigned_worker: null,
      sla_deadline: '2026-11-25T12:00:00Z',
      is_overdue: false,
      created_at: '2026-11-12T09:30:00Z',
    },
    {
      id: '103',
      tracking_code: 'SAN-103',
      category: 'Garbage Dump',
      status: 'Completed',
      priority: 'low',
      zone: { id: '2', name: 'Zone B' },
      assigned_worker: { id: 'w2', name: 'Anita Sharma' },
      sla_deadline: '2026-11-08T10:00:00Z',
      is_overdue: true,
      created_at: '2026-11-07T08:00:00Z',
    },
  ]

  it('renders table rows with tracking code link, category, badges, zone, and assigned worker', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: sampleItems,
      total: 3,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)

    // Row 1 checks
    const row1 = rows[0]
    const link1 = row1.findComponent(RouterLinkStub)
    expect(link1.exists()).toBe(true)
    expect(link1.text()).toBe('SAN-101')
    expect(link1.props().to).toBe('/admin/complaints/101')
    expect(row1.text()).toContain('Garbage Dump')
    expect(row1.text()).toContain('Submitted')
    expect(row1.text()).toContain('Critical')
    expect(row1.text()).toContain('Zone A')
    expect(row1.text()).toContain('Ravi Patil')

    // Row 2 checks: zone is null ("-"), worker is null ("Unassigned")
    const row2 = rows[1]
    expect(row2.findComponent(RouterLinkStub).text()).toBe('SAN-102')
    expect(row2.findComponent(RouterLinkStub).props().to).toBe('/admin/complaints/102')
    expect(row2.text()).toContain('-')
    expect(row2.text()).toContain('Unassigned')

    // Verifies no coordinates or phone numbers exist
    expect(wrapper.text()).not.toMatch(/17\.\d+/)
    expect(wrapper.text()).not.toMatch(/75\.\d+/)
    expect(wrapper.text()).not.toMatch(/\+91\d+/)
  })

  it('shows "Overdue" text flag only on overdue non-completed complaints', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: sampleItems,
      total: 3,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')

    // Row 1: is_overdue = true, status = 'Submitted' -> Overdue flag MUST show
    expect(rows[0].find('.ns-overdue-flag').exists()).toBe(true)
    expect(rows[0].find('.ns-overdue-flag').text()).toBe('Overdue')

    // Row 2: is_overdue = false, status = 'In-Progress' -> Overdue flag MUST NOT show
    expect(rows[1].find('.ns-overdue-flag').exists()).toBe(false)

    // Row 3: is_overdue = true, status = 'Completed' -> Overdue flag MUST NOT show
    expect(rows[2].find('.ns-overdue-flag').exists()).toBe(false)
  })

  it('renders pagination with Previous disabled on page 1 and Next disabled on last page', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: sampleItems,
      total: 45,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.find('.ns-page-info').text()).toBe('Page 1 of 3')

    const prevBtn = wrapper.find('.ns-page-btn:first-of-type')
    const nextBtn = wrapper.findAll('.ns-page-btn')[1]

    expect(prevBtn.text()).toBe('Previous')
    expect(prevBtn.attributes('disabled')).toBeDefined()
    expect(nextBtn.text()).toBe('Next')
    expect(nextBtn.attributes('disabled')).toBeUndefined()
  })

  it('clicking Next increments page and calls fetchAdminComplaints with page 2', async () => {
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: sampleItems,
      total: 45,
      page: 1,
      pageSize: 20,
    })

    const { wrapper, router } = await mountView()
    await flushPromises()

    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValueOnce({
      items: sampleItems,
      total: 45,
      page: 2,
      pageSize: 20,
    })

    const nextBtn = wrapper.findAll('.ns-page-btn')[1]
    await nextBtn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.page).toBe('2')
    expect(adminApi.fetchAdminComplaints).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
      }),
    )
  })
})

describe('AdminComplaintsView — filters, debounced search, URL sync, and auxiliary resilience', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reads filters and page from the URL query on mount', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({ by_category: [], by_zone: [] })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([])
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
    })

    const initialQuery = {
      status: 'Submitted',
      category: 'Garbage Dump',
      zone_id: '1',
      overdue: 'true',
      unassigned: 'true',
      q: 'SAN-101',
      page: '2',
    }

    await mountView(initialQuery)
    await flushPromises()

    expect(adminApi.fetchAdminComplaints).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Submitted',
        category: 'Garbage Dump',
        zoneId: '1',
        overdue: true,
        unassigned: true,
        q: 'SAN-101',
        page: 2,
      }),
    )
  })

  it('resets page to 1 when a filter changes and replaces URL query', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({ by_category: [], by_zone: [] })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([])
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValue({
      items: [],
      total: 40,
      page: 2,
      pageSize: 20,
    })

    const { wrapper, router } = await mountView({ page: '2' })
    await flushPromises()

    const replaceSpy = vi.spyOn(router, 'replace')

    const filtersComp = wrapper.findComponent(ComplaintFilters)
    await filtersComp.vm.$emit('update', {
      q: '',
      status: 'In-Progress',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
    })
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({
      query: { status: 'In-Progress' },
    })
    expect(adminApi.fetchAdminComplaints).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'In-Progress',
        page: 1,
      }),
    )
  })

  it('debounces search input by 300ms using fake timers', async () => {
    vi.useFakeTimers()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({ by_category: [], by_zone: [] })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([])
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(adminApi.fetchAdminComplaints).toHaveBeenCalledTimes(1)

    const searchInput = wrapper.find('#complaint-filter-search')
    await searchInput.setValue('dump')

    // At 200ms, no extra fetch yet
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(adminApi.fetchAdminComplaints).toHaveBeenCalledTimes(1)

    // At 300ms, debounced fetch triggers
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(adminApi.fetchAdminComplaints).toHaveBeenCalledTimes(2)
    expect(adminApi.fetchAdminComplaints).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'dump',
        page: 1,
      }),
    )

    vi.useRealTimers()
  })

  it('still renders the list successfully when fetchZones and fetchStats fail', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockRejectedValue(new Error('Stats service unavailable'))
    vi.spyOn(referenceApi, 'fetchZones').mockRejectedValue(new Error('Zones service unavailable'))
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValue({
      items: [
        {
          id: '1',
          tracking_code: 'SAN-001',
          category: 'Garbage Dump',
          status: 'Submitted',
          priority: 'high',
          zone: null,
          assigned_worker: null,
          sla_deadline: '2026-11-20T10:00:00Z',
          is_overdue: false,
          created_at: '2026-11-14T09:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.findComponent(ErrorAlert).exists()).toBe(false)
    expect(wrapper.find('header p').text()).toBe('1 complaint')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('SAN-001')
  })
})

describe('AdminComplaintsView — CSV export trigger and active filters', () => {
  const dummyBlob = new Blob(['tracking_code,category\nSAN-001,Garbage'], { type: 'text/csv' })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [{ category: 'Garbage Dump', count: 5 }],
      by_zone: [],
    })
    vi.spyOn(referenceApi, 'fetchZones').mockResolvedValue([
      { id: '1', name: 'Zone A' },
      { id: '2', name: 'Zone B' },
    ])
    vi.spyOn(adminApi, 'fetchAdminComplaints').mockResolvedValue({
      items: [
        {
          id: '1',
          tracking_code: 'SAN-001',
          category: 'Garbage Dump',
          status: 'Submitted',
          priority: 'high',
          zone: { id: '1', name: 'Zone A' },
          assigned_worker: null,
          sla_deadline: '2026-11-20T10:00:00Z',
          is_overdue: false,
          created_at: '2026-11-14T09:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    vi.spyOn(adminApi, 'exportAdminComplaintsCsv').mockResolvedValue(dummyBlob)
  })

  it('calls exportAdminComplaintsCsv with current active filters and triggers downloadBlob', async () => {
    const { wrapper } = await mountView({
      status: 'Submitted',
      category: 'Garbage Dump',
      zone_id: '1',
      overdue: 'true',
      unassigned: 'true',
      q: 'corner',
    })
    await flushPromises()

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Download CSV'))
    expect(exportBtn).toBeDefined()

    await exportBtn.trigger('click')
    await flushPromises()

    expect(adminApi.exportAdminComplaintsCsv).toHaveBeenCalledWith({
      status: 'Submitted',
      category: 'Garbage Dump',
      zoneId: '1',
      overdue: true,
      unassigned: true,
      q: 'corner',
    })
    expect(buildComplaintsCsvFilename).toHaveBeenCalled()
    expect(downloadBlob).toHaveBeenCalledWith(dummyBlob, 'complaints-2026-11-14.csv')
  })

  it('calls exportAdminComplaintsCsv with empty filter defaults when no filters are active', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Download CSV'))

    await exportBtn.trigger('click')
    await flushPromises()

    expect(adminApi.exportAdminComplaintsCsv).toHaveBeenCalledWith({
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
      q: '',
    })
    expect(buildComplaintsCsvFilename).toHaveBeenCalled()
    expect(downloadBlob).toHaveBeenCalledWith(dummyBlob, 'complaints-2026-11-14.csv')
  })

  it('disables button and displays "Preparing..." while export is in progress', async () => {
    let resolveExport
    vi.spyOn(adminApi, 'exportAdminComplaintsCsv').mockReturnValueOnce(
      new Promise((res) => {
        resolveExport = res
      }),
    )

    const { wrapper } = await mountView()
    await flushPromises()

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Download CSV'))

    await exportBtn.trigger('click')

    expect(exportBtn.attributes('disabled')).toBeDefined()
    expect(exportBtn.text()).toContain('Preparing...')

    resolveExport(dummyBlob)
    await flushPromises()

    expect(exportBtn.attributes('disabled')).toBeUndefined()
    expect(exportBtn.text()).toContain('Download CSV')
  })

  it('shows inline ErrorAlert and re-enables button upon export failure', async () => {
    vi.spyOn(adminApi, 'exportAdminComplaintsCsv').mockRejectedValueOnce({
      response: { status: 403 },
    })

    const { wrapper } = await mountView()
    await flushPromises()

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Download CSV'))

    await exportBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Export failed')
    expect(wrapper.text()).toContain('You do not have permission to do this.')
    expect(exportBtn.attributes('disabled')).toBeUndefined()
    expect(exportBtn.text()).toContain('Download CSV')
  })
})




