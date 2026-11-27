import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import AdminTriageView from '../AdminTriageView.vue'
import * as triageApi from '../../api/triageApi'
import { useAuthStore } from '../../stores/auth'
import { useTriageBadgeStore } from '../../stores/triageBadge'

function createMockPendingResponse() {
  return {
    items: [
      {
        id: 'trg-1',
        complaint_id: 'c-101',
        tracking_code: 'GRV-2026-TR01',
        predicted_category: 'Solid Waste & Garbage',
        ai_confidence: 0.58,
        status: 'pending',
        final_category: null,
        description: 'Overflowing garbage bin',
        image_url: 'https://images.local/t1.jpg',
        created_at: '2026-11-25T10:00:00Z',
        zone: 'Zone A',
        classifier_source: 'image',
      },
      {
        id: 'trg-2',
        complaint_id: 'c-102',
        tracking_code: 'GRV-2026-TR02',
        predicted_category: 'Potholes & Road Damage',
        ai_confidence: 0.46,
        status: 'pending',
        final_category: null,
        description: 'Deep road depression',
        image_url: null,
        created_at: '2026-11-25T12:00:00Z',
        zone: 'Zone B',
        classifier_source: 'text',
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  }
}

function createMockReviewedResponse() {
  return {
    items: [
      {
        id: 'trg-5',
        complaint_id: 'c-105',
        tracking_code: 'GRV-2026-TR05',
        predicted_category: 'Illegal Encroachment',
        final_category: 'Illegal Encroachment',
        ai_confidence: 0.65,
        status: 'reviewed',
        description: 'Footpath stalls',
        image_url: null,
        created_at: '2026-11-20T08:00:00Z',
        reviewed_at: '2026-11-21T09:00:00Z',
        zone: 'Zone A',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  }
}

describe('AdminTriageView', () => {
  let pinia
  let authStore
  let badgeStore

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    badgeStore = useTriageBadgeStore()
    authStore.user = {
      name: 'Demo Admin',
      department: { id: 'd1', name: 'Sanitation' },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders page header with eyebrow, title, subtitle, and info note', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.get('.ns-eyebrow').text()).toBe('SANITATION DEPARTMENT')
    expect(wrapper.get('.ns-page-title').text()).toBe('Triage')
    expect(wrapper.get('.ns-page-subtitle').text()).toContain(
      'Complaints the AI was not sure about.',
    )
    expect(wrapper.get('.ns-triage-info-note').text()).toContain(
      'These complaints are already submitted and assigned using the AI guess.',
    )
  })

  it('loads pending cases on mount, updates badge store, and selects first item', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())
    const setBadgeSpy = vi.spyOn(badgeStore, 'setPendingCount')

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(setBadgeSpy).toHaveBeenCalledWith(2)
    expect(badgeStore.pendingCount).toBe(2)

    const reviewPanel = wrapper.get('[data-test="triage-review-panel"]')
    expect(reviewPanel.text()).toContain('GRV-2026-TR01')
    expect(reviewPanel.text()).toContain('Overflowing garbage bin')
  })

  it('displays loading spinner and handles load errors with retry', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockRejectedValueOnce(new Error('Network failure'))

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load triage cases')
    expect(wrapper.text()).toContain('Failed to load triage cases.')

    // Retry succeeds
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())
    await wrapper.get('button.btn-outline-danger').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="triage-review-panel"]').exists()).toBe(true)
  })

  it('allows selecting another item in the queue', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    const secondItem = wrapper.get('[data-test="triage-item-trg-2"]')
    await secondItem.trigger('click')

    const reviewPanel = wrapper.get('[data-test="triage-review-panel"]')
    expect(reviewPanel.text()).toContain('GRV-2026-TR02')
    expect(reviewPanel.text()).toContain('Deep road depression')
  })

  it('confirms category for same department: removes item, decrements count, and shows success banner', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())
    vi.spyOn(triageApi, 'confirmTriageCategory').mockResolvedValueOnce({
      id: 'trg-1',
      tracking_code: 'GRV-2026-TR01',
      status: 'reviewed',
      final_category: 'Solid Waste & Garbage',
      moved_to_department: null,
    })
    const decrementSpy = vi.spyOn(badgeStore, 'decrementPendingCount')

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    const confirmBtn = wrapper.get('[data-test="confirm-btn"]')
    await confirmBtn.trigger('click')
    await flushPromises()

    expect(decrementSpy).toHaveBeenCalled()
    expect(wrapper.get('[data-test="success-banner"]').text()).toContain('Category confirmed')

    expect(wrapper.findAll('.ns-triage-item')).toHaveLength(1)
    expect(wrapper.get('[data-test="triage-review-panel"]').text()).toContain('GRV-2026-TR02')
  })

  it('confirms cross-department category: shows "Moved to <department>" message', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())
    vi.spyOn(triageApi, 'confirmTriageCategory').mockResolvedValueOnce({
      id: 'trg-1',
      tracking_code: 'GRV-2026-TR01',
      status: 'reviewed',
      final_category: 'Potholes & Road Damage',
      moved_to_department: 'Public Works Department',
    })

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    const pickerOptions = wrapper.findAll('.ns-category-option')
    await pickerOptions[1].trigger('click')

    const confirmBtn = wrapper.get('[data-test="confirm-btn"]')
    await confirmBtn.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="success-banner"]').text()).toContain(
      'Moved to Public Works Department',
    )
  })

  it('switches to Reviewed tab and displays read-only review inspector', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems')
      .mockResolvedValueOnce(createMockPendingResponse())
      .mockResolvedValueOnce(createMockReviewedResponse())

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    await wrapper.get('[data-test="tab-reviewed"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('.ns-card-title').text()).toBe('Reviewed cases')
    expect(wrapper.find('[data-test="pending-actions"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="reviewed-summary"]').text()).toContain('Illegal Encroachment')
  })

  it('handles 409 already reviewed error by showing notice and reloading list', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems')
      .mockResolvedValueOnce(createMockPendingResponse())
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })

    const error409 = new Error('Conflict')
    error409.response = {
      status: 409,
      data: { detail: 'This case has already been reviewed' },
    }
    vi.spyOn(triageApi, 'confirmTriageCategory').mockRejectedValueOnce(error409)

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    await wrapper.get('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="error-banner"]').text()).toContain(
      'This case has already been reviewed',
    )
  })

  it('handles 409 complaint is already being handled error without removing item', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce(createMockPendingResponse())

    const errorHandling = new Error('Conflict')
    errorHandling.response = {
      status: 409,
      data: {
        detail: 'Complaint is already being handled; its category can no longer be changed',
      },
    }
    vi.spyOn(triageApi, 'confirmTriageCategory').mockRejectedValueOnce(errorHandling)

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    await wrapper.get('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="error-banner"]').text()).toContain(
      'Complaint is already being handled. Its category can no longer be changed.',
    )
    expect(wrapper.findAll('.ns-triage-item')).toHaveLength(2)
  })

  it('handles 404 not found error by showing notice and reloading list', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems')
      .mockResolvedValueOnce(createMockPendingResponse())
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })

    const error404 = new Error('Not found')
    error404.response = { status: 404, data: { detail: 'Triage case not found' } }
    vi.spyOn(triageApi, 'confirmTriageCategory').mockRejectedValueOnce(error404)

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    await wrapper.get('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="error-banner"]').text()).toContain(
      'This case no longer exists',
    )
  })

  it('renders empty state when there are no pending cases to review', async () => {
    vi.spyOn(triageApi, 'fetchTriageItems').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.get('[data-test="triage-list-empty"]').text()).toContain(
      'Nothing to review. Every complaint was classified with high confidence.',
    )
    expect(wrapper.get('[data-test="review-placeholder"]').text()).toContain(
      'Select a case from the list to review.',
    )
  })

  it('handles page change event by fetching the next page', async () => {
    const fetchSpy = vi
      .spyOn(triageApi, 'fetchTriageItems')
      .mockResolvedValueOnce(createMockPendingResponse())
      .mockResolvedValueOnce({
        items: [
          {
            id: 'trg-3',
            complaint_id: 'c-103',
            tracking_code: 'GRV-2026-TR03',
            predicted_category: 'Waterlogging & Drainage',
            ai_confidence: 0.64,
            status: 'pending',
            created_at: '2026-11-26T09:00:00Z',
          },
        ],
        total: 25,
        page: 2,
        pageSize: 20,
      })

    const wrapper = mount(AdminTriageView, { global: { plugins: [pinia] } })
    await flushPromises()

    // Simulate page-change from TriageList component
    const listComponent = wrapper.findComponent({ name: 'TriageList' })
    listComponent.vm.$emit('page-change', 2)
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledWith({
      status: 'pending',
      page: 2,
      pageSize: 20,
    })
    expect(wrapper.get('[data-test="triage-review-panel"]').text()).toContain('GRV-2026-TR03')
  })
})
