import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { nextTick } from 'vue'
import AdminWorkerCreateView from '../AdminWorkerCreateView.vue'
import { fetchDepartments, fetchZones } from '../../api/referenceApi'
import { createWorker } from '../../api/workersApi'

vi.mock('../../api/referenceApi', () => ({
  fetchDepartments: vi.fn(),
  fetchZones: vi.fn(),
}))

vi.mock('../../api/workersApi', () => ({
  createWorker: vi.fn(),
}))

const mockDepartments = [
  { id: 'd2', name: 'Water Supply Board' },
  { id: 'd1', name: 'Solid Waste Management' },
]

const mockZones = [
  { id: 'z1', name: 'Zone A' },
  { id: 'z2', name: 'Zone B' },
]

describe('AdminWorkerCreateView - Loading, Options & Input Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDepartments.mockResolvedValue(mockDepartments)
    fetchZones.mockResolvedValue(mockZones)
  })

  it('shows centered role="status" spinner and no form while options are loading', async () => {
    fetchDepartments.mockReturnValue(new Promise(() => {}))
    fetchZones.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await nextTick()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading form...')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows error alert on load failure, no form, and reloads on Try again', async () => {
    fetchDepartments.mockRejectedValueOnce(new Error('Network failure'))
    fetchZones.mockResolvedValueOnce(mockZones)

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load form data')
    expect(wrapper.find('form').exists()).toBe(false)

    fetchDepartments.mockResolvedValueOnce(mockDepartments)
    fetchZones.mockResolvedValueOnce(mockZones)

    const retryBtn = wrapper.find('.alert-danger button')
    await retryBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('populates department select sorted alphabetically and zone select with default options', async () => {
    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    const deptSelect = wrapper.find('#worker-department')
    const deptOptions = deptSelect.findAll('option').map((o) => o.text())
    expect(deptOptions).toEqual([
      'Select department',
      'Solid Waste Management',
      'Water Supply Board',
    ])

    const zoneSelect = wrapper.find('#worker-zone')
    const zoneOptions = zoneSelect.findAll('option').map((o) => o.text())
    expect(zoneOptions).toEqual(['Select zone', 'Zone A', 'Zone B'])
  })

  it('strips letters and symbols from PIN and confirm PIN inputs as the user types', async () => {
    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    const pinInput = wrapper.find('#worker-pin')
    await pinInput.setValue('a1b2c3!@45')
    expect(wrapper.vm.form.pin).toBe('1234')

    const confirmPinInput = wrapper.find('#worker-confirm-pin')
    await confirmPinInput.setValue('x9-8-7=6')
    expect(wrapper.vm.form.confirmPin).toBe('9876')
  })
})

describe('AdminWorkerCreateView - Validation and Submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDepartments.mockResolvedValue(mockDepartments)
    fetchZones.mockResolvedValue(mockZones)
  })

  it('shows all six client validation messages and does not call createWorker on empty submit', async () => {
    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('form').trigger('submit.prevent')

    expect(createWorker).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("Enter the worker's full name.")
    expect(wrapper.text()).toContain('Enter a valid phone number.')
    expect(wrapper.text()).toContain('Choose a department.')
    expect(wrapper.text()).toContain('Choose a zone.')
    expect(wrapper.text()).toContain('PIN must be exactly 4 digits.')
    expect(wrapper.text()).toContain('PINs do not match.')
  })

  it('shows "PINs do not match." when confirm PIN differs from PIN', async () => {
    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Ramesh Kumar')
    await wrapper.find('#worker-phone').setValue('9822200001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('4321')

    await wrapper.find('form').trigger('submit.prevent')

    expect(createWorker).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('PINs do not match.')
  })

  it('calls createWorker with valid inputs, disables button while pending, and ignores double submit', async () => {
    let resolveCreate
    createWorker.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('  Ramesh Kumar  ')
    await wrapper.find('#worker-phone').setValue('+91 98222 00001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    expect(createWorker).toHaveBeenCalledTimes(1)
    expect(createWorker).toHaveBeenCalledWith({
      name: '  Ramesh Kumar  ',
      phone: '+91 98222 00001',
      pin: '1234',
      department_id: 'd1',
      zone_id: 'z1',
    })

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
    expect(submitBtn.text()).toContain('Creating...')

    // Attempt double submit while pending
    await wrapper.find('form').trigger('submit.prevent')
    expect(createWorker).toHaveBeenCalledTimes(1)

    resolveCreate({
      id: '109',
      name: 'Ramesh Kumar',
      phone: '+919822200001',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Worker added')
  })

  it('renders success card with summary, formatted phone, and no PIN anywhere in rendered HTML', async () => {
    createWorker.mockResolvedValueOnce({
      id: '109',
      name: 'Ramesh Kumar',
      phone: '+919822200001',
      department: 'Solid Waste Management',
      zone: 'Zone A',
      is_active: true,
    })

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Ramesh Kumar')
    await wrapper.find('#worker-phone').setValue('9822200001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Worker added')
    expect(wrapper.text()).toContain('Ramesh Kumar')
    expect(wrapper.text()).toContain('Solid Waste Management')
    expect(wrapper.text()).toContain('Zone A')
    expect(wrapper.text()).toContain('+91 98222 00001')
    expect(wrapper.text()).toContain('They can now sign in with their phone number and the PIN you set.')

    // PIN must never appear in rendered HTML
    expect(wrapper.html().toLowerCase()).not.toContain('1234')

    // "Add another worker" button returns to empty form
    await wrapper.find('.worker-success button').trigger('click')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.vm.form.name).toBe('')
    expect(wrapper.vm.form.phone).toBe('')
    expect(wrapper.vm.form.pin).toBe('')
    expect(wrapper.vm.form.confirmPin).toBe('')
  })
})

describe('AdminWorkerCreateView - Server Errors and Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDepartments.mockResolvedValue(mockDepartments)
    fetchZones.mockResolvedValue(mockZones)
  })

  it('maps server 422 detail array to field-specific invalid feedback', async () => {
    createWorker.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'name'], msg: 'Name is invalid' },
            { loc: ['body', 'phone'], msg: 'Phone is invalid' },
          ],
        },
      },
    })

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Valid Name')
    await wrapper.find('#worker-phone').setValue('9822200001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Name is invalid')
    expect(wrapper.text()).toContain('Phone is invalid')
    // Both PIN fields are cleared after failure
    expect(wrapper.vm.form.pin).toBe('')
    expect(wrapper.vm.form.confirmPin).toBe('')
  })

  it('displays duplicate phone message under phone field on 409 conflict and clears PINs', async () => {
    createWorker.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: 'A worker with this phone number already exists' },
      },
    })

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Valid Name')
    await wrapper.find('#worker-phone').setValue('9876543210')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('A worker with this phone number already exists.')
    expect(wrapper.vm.form.pin).toBe('')
    expect(wrapper.vm.form.confirmPin).toBe('')
  })

  it('displays general ErrorAlert on 500 server error and clears PINs', async () => {
    createWorker.mockRejectedValueOnce({
      response: { status: 500 },
    })

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Valid Name')
    await wrapper.find('#worker-phone').setValue('9822200001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not create worker')
    expect(wrapper.text()).toContain('Server error. Please try again later.')
    expect(wrapper.vm.form.pin).toBe('')
    expect(wrapper.vm.form.confirmPin).toBe('')
  })

  it('does not throw when createWorker resolves or rejects after unmount', async () => {
    let resolveCall
    createWorker.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )

    const wrapper = mount(AdminWorkerCreateView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    await wrapper.find('#worker-name').setValue('Valid Name')
    await wrapper.find('#worker-phone').setValue('9822200001')
    await wrapper.find('#worker-department').setValue('d1')
    await wrapper.find('#worker-zone').setValue('z1')
    await wrapper.find('#worker-pin').setValue('1234')
    await wrapper.find('#worker-confirm-pin').setValue('1234')

    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    wrapper.unmount()

    expect(() => {
      resolveCall({
        id: '109',
        name: 'Valid Name',
        phone: '+919822200001',
        department: 'Solid Waste Management',
        zone: 'Zone A',
        is_active: true,
      })
    }).not.toThrow()
    await flushPromises()
  })
})

