import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount as baseMount, RouterLinkStub } from '@vue/test-utils'
import { nextTick } from 'vue'
import AdminWorkersView from '../AdminWorkersView.vue'
import DataTable from '../../components/DataTable.vue'
import EmptyState from '../../components/EmptyState.vue'
import { fetchWorkers } from '../../api/workersApi'

function mount(component, options = {}) {
  return baseMount(component, {
    ...options,
    global: {
      stubs: { RouterLink: RouterLinkStub },
      ...options?.global,
    },
  })
}

vi.mock('../../api/workersApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchWorkers: vi.fn(),
    setWorkerActive: vi.fn(),
  }
})

const mockWorkersList = [
  {
    id: '101',
    name: 'Ravi Patil',
    phone: '+919876543210',
    department: 'Solid Waste Management',
    zone: 'Zone A',
    is_active: true,
  },
  {
    id: '102',
    name: 'Anita Sharma',
    phone: '+919123456780',
    department: 'Water Supply Board',
    zone: 'Zone B',
    is_active: true,
  },
  {
    id: '103',
    name: 'Deactivated Worker',
    phone: '+919000000000',
    department: 'Roads & Public Works',
    zone: 'Zone C',
    is_active: false,
  },
  {
    id: '104',
    name: 'Empty Queue Worker',
    phone: '+919555500000',
    department: 'Solid Waste Management',
    zone: 'Zone B',
    is_active: true,
  },
  {
    id: '105',
    name: 'Error Demo Worker',
    phone: '+919666600000',
    department: 'Stormwater & Drainage',
    zone: 'Zone D',
    is_active: true,
  },
  {
    id: '106',
    name: 'Meera Joshi',
    phone: '+919811100001',
    department: 'Municipal Electrical Wing',
    zone: 'Zone A',
    is_active: true,
  },
  {
    id: '107',
    name: 'Imran Khan',
    phone: '+919811100002',
    department: 'Public Health & Veterinary',
    zone: 'Zone C',
    is_active: true,
  },
  {
    id: '108',
    name: 'Suresh Nair',
    phone: '+919811100003',
    department: 'Town Planning & Encroachment',
    zone: 'Zone D',
    is_active: false,
  },
]

function getMockWorkers() {
  return JSON.parse(JSON.stringify(mockWorkersList))
}

describe('AdminWorkersView - Table, Formatting & Filters', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders an "Add worker" link pointing to the admin-worker-new route', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('Add worker')
    expect(link.props('to')).toEqual({ name: 'admin-worker-new' })
  })

  it('shows centered role="status" spinner and no table while the first call is pending', async () => {
    fetchWorkers.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(AdminWorkersView)
    await nextTick()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading workers...')
    expect(wrapper.findComponent(DataTable).exists()).toBe(false)
  })

  it('renders rows with formatted phones, status pills, and subtitle "8 workers · 6 active"', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('8 workers · 6 active')

    const table = wrapper.getComponent(DataTable)
    const rows = table.findAll('tbody tr')
    expect(rows).toHaveLength(8)

    // Formatted phone number
    expect(wrapper.text()).toContain('+91 98765 43210')
    expect(wrapper.text()).not.toContain('+919876543210')

    // Status pills text
    const pills = wrapper.findAll('.worker-status-pill')
    expect(pills).toHaveLength(8)
    const activePills = pills.filter((p) => p.text().includes('Active') && !p.text().includes('Inactive'))
    const inactivePills = pills.filter((p) => p.text().includes('Inactive'))
    expect(activePills).toHaveLength(6)
    expect(inactivePills).toHaveLength(2)
  })

  it('populates Department and Zone select dropdowns with distinct values sorted alphabetically', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const deptSelect = wrapper.get('#worker-department')
    const deptOptions = deptSelect.findAll('option').map((o) => o.text())
    expect(deptOptions[0]).toBe('All departments')
    // 7 unique departments across the 8 mock workers
    expect(deptOptions.slice(1)).toEqual([
      'Municipal Electrical Wing',
      'Public Health & Veterinary',
      'Roads & Public Works',
      'Solid Waste Management',
      'Stormwater & Drainage',
      'Town Planning & Encroachment',
      'Water Supply Board',
    ])

    const zoneSelect = wrapper.get('#worker-zone')
    const zoneOptions = zoneSelect.findAll('option').map((o) => o.text())
    expect(zoneOptions[0]).toBe('All zones')
    expect(zoneOptions.slice(1)).toEqual(['Zone A', 'Zone B', 'Zone C', 'Zone D'])
  })

  it('filters rows by name case-insensitively and phone digits typed with spaces', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const searchInput = wrapper.get('#worker-search')

    // Name search case-insensitive
    await searchInput.setValue('anita')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('Anita Sharma')

    // Phone search with spaces
    await searchInput.setValue('98111 00001')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('Meera Joshi')

    // Reset search
    await searchInput.setValue('')
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
  })

  it('narrows rows with combined department, zone, and status filters', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    // Department filter
    await wrapper.get('#worker-department').setValue('Solid Waste Management')
    // Workers 101 (Zone A) and 104 (Zone B)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)

    // Zone filter
    await wrapper.get('#worker-zone').setValue('Zone A')
    // Only Worker 101
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('Ravi Patil')

    // Status filter
    await wrapper.get('#worker-status').setValue('inactive')
    // Worker 101 is active, so 0 matches
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)

    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No workers match your filters')

    // Clear filters button
    await empty.get('button').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
  })

  it('shows "No workers yet" when the worker list is empty', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: [],
      total: 0,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const empty = wrapper.getComponent(EmptyState)
    expect(empty.get('h3').text()).toBe('No workers yet')
    expect(empty.get('p').text()).toBe('Workers you add will appear here.')
  })
})

describe('AdminWorkersView - Actions, Errors & Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows error alert on 500 error, hides table, and retries when "Try again" is clicked', async () => {
    fetchWorkers.mockRejectedValueOnce({ response: { status: 500 } })
    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const alert = wrapper.find('.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.find('.alert-heading').text()).toBe('Could not load workers')
    expect(alert.text()).toContain('Server error. Please try again later.')
    expect(wrapper.findComponent(DataTable).exists()).toBe(false)

    // Retry success
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const tryAgainBtn = alert.find('button')
    await tryAgainBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(DataTable).exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
  })

  it('keeps previously loaded rows when a refresh fails', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)

    // Mock refresh failure
    fetchWorkers.mockRejectedValueOnce({ response: { status: 500 } })

    const refreshBtn = wrapper.find('.btn-outline-secondary')
    await refreshBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.alert-danger').text()).toContain('Server error. Please try again later.')
    // Old rows must remain rendered
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
  })

  it('shows inline deactivation confirmation on click without calling API, and Cancel hides it', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const { setWorkerActive } = await import('../../api/workersApi')
    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const deactivateBtn = wrapper.find('button[aria-label="Deactivate Ravi Patil"]')
    expect(deactivateBtn.exists()).toBe(true)

    // Clicking Deactivate should NOT call API
    await deactivateBtn.trigger('click')
    expect(setWorkerActive).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Deactivate this worker?')
    expect(wrapper.text()).toContain('Yes, deactivate')
    expect(wrapper.text()).toContain('Cancel')

    // Clicking Cancel restores original button
    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelBtn.trigger('click')
    expect(wrapper.text()).not.toContain('Deactivate this worker?')
    expect(wrapper.find('button[aria-label="Deactivate Ravi Patil"]').exists()).toBe(true)
  })

  it('ensures only one row can be confirming deactivation at a time', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    // Confirm row 101
    await wrapper.find('button[aria-label="Deactivate Ravi Patil"]').trigger('click')
    expect(wrapper.text()).toContain('Deactivate this worker?')

    // Confirm row 102
    await wrapper.find('button[aria-label="Deactivate Anita Sharma"]').trigger('click')

    // Only one confirmation prompt is active
    const confirmTexts = wrapper.findAll('span').filter((s) => s.text() === 'Deactivate this worker?')
    expect(confirmTexts).toHaveLength(1)
  })

  it('calls setWorkerActive on "Yes, deactivate", disables buttons while pending, updates to Inactive and decrements active count', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const { setWorkerActive } = await import('../../api/workersApi')
    let resolveToggle
    setWorkerActive.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveToggle = resolve
      }),
    )

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('8 workers · 6 active')

    await wrapper.find('button[aria-label="Deactivate Ravi Patil"]').trigger('click')
    const yesBtn = wrapper.findAll('button').find((b) => b.text().includes('Yes, deactivate'))
    await yesBtn.trigger('click')
    await nextTick()

    expect(setWorkerActive).toHaveBeenCalledWith('101', false)
    expect(yesBtn.attributes('disabled')).toBeDefined()

    // Resolve toggle
    resolveToggle({
      id: '101',
      name: 'Ravi Patil',
      phone: '+919876543210',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: false,
    })
    await flushPromises()

    // Subtitle updated to one fewer active
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('8 workers · 5 active')
    // Row 101 now shows Activate button
    expect(wrapper.find('button[aria-label="Activate Ravi Patil"]').exists()).toBe(true)
  })

  it('keeps worker active and displays actionError when setWorkerActive rejects', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const { setWorkerActive } = await import('../../api/workersApi')
    setWorkerActive.mockRejectedValueOnce({ response: { status: 500 } })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    await wrapper.find('button[aria-label="Deactivate Ravi Patil"]').trigger('click')
    const yesBtn = wrapper.findAll('button').find((b) => b.text().includes('Yes, deactivate'))
    await yesBtn.trigger('click')
    await flushPromises()

    // Action error displayed
    expect(wrapper.text()).toContain('Could not update worker')
    expect(wrapper.text()).toContain('Server error. Please try again later.')

    // Worker remains active
    expect(wrapper.find('button[aria-label="Deactivate Ravi Patil"]').exists()).toBe(true)
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('8 workers · 6 active')
  })

  it('calls setWorkerActive directly with true when clicking Activate', async () => {
    fetchWorkers.mockResolvedValueOnce({
      items: getMockWorkers(),
      total: 8,
    })

    const { setWorkerActive } = await import('../../api/workersApi')
    setWorkerActive.mockResolvedValueOnce({
      id: '103',
      name: 'Deactivated Worker',
      phone: '+919000000000',
      department: 'Roads & Public Works',
      zone: 'Zone C',
      is_active: true,
    })

    const wrapper = mount(AdminWorkersView)
    await flushPromises()

    const activateBtn = wrapper.find('button[aria-label="Activate Deactivated Worker"]')
    expect(activateBtn.exists()).toBe(true)

    await activateBtn.trigger('click')
    await flushPromises()

    expect(setWorkerActive).toHaveBeenCalledWith('103', true)
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('8 workers · 7 active')
  })

  it('handles overlapping fetch calls and only displays the latest call data', async () => {
    let resolveFirst
    let resolveSecond
    const promise1 = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const promise2 = new Promise((resolve) => {
      resolveSecond = resolve
    })

    fetchWorkers.mockReturnValueOnce(promise1)

    const wrapper = mount(AdminWorkersView)
    await nextTick()

    fetchWorkers.mockReturnValueOnce(promise2)
    wrapper.vm.loadWorkers()

    // Resolve second request first with 1 item
    resolveSecond({
      items: [getMockWorkers()[0]],
      total: 1,
    })
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('1 worker · 1 active')

    // Stale first request resolves later with 8 items
    resolveFirst({
      items: mockWorkersList,
      total: 8,
    })
    await flushPromises()

    // Stale response must be discarded
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('.ns-page-header__subtitle').text()).toBe('1 worker · 1 active')
  })

  it('does not throw when an API response arrives after unmounting', async () => {
    let resolveCall
    fetchWorkers.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )

    const wrapper = mount(AdminWorkersView)
    await nextTick()

    wrapper.unmount()

    expect(() => {
      resolveCall({ items: mockWorkersList, total: 8 })
    }).not.toThrow()
    await flushPromises()
  })
})
