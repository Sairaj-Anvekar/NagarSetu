import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TriageList from '../TriageList.vue'

const MOCK_PENDING_ITEMS = [
  {
    id: 'trg-1',
    tracking_code: 'GRV-2026-TR01',
    predicted_category: 'Solid Waste & Garbage',
    ai_confidence: 0.58,
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    zone: 'Zone A',
  },
  {
    id: 'trg-2',
    tracking_code: 'GRV-2026-TR02',
    predicted_category: 'Potholes & Road Damage',
    ai_confidence: 0.46,
    status: 'pending',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    zone: 'Zone B',
  },
]

const MOCK_REVIEWED_ITEMS = [
  {
    id: 'trg-5',
    tracking_code: 'GRV-2026-TR05',
    predicted_category: 'Streetlight',
    final_category: 'Streetlight',
    status: 'reviewed',
    created_at: '2026-11-20T10:00:00Z',
    reviewed_at: '2026-11-21T12:00:00Z',
    zone: 'Zone C',
  },
]

describe('TriageList', () => {
  it('renders pending items list with header, wait time, and zone chips', () => {
    const wrapper = mount(TriageList, {
      props: {
        items: MOCK_PENDING_ITEMS,
        selectedId: 'trg-1',
        status: 'pending',
        total: 2,
      },
    })

    expect(wrapper.get('.ns-card-title').text()).toBe('Waiting for review')
    expect(wrapper.get('.ns-card-subtitle').text()).toBe('Oldest first')
    expect(wrapper.get('[data-test="triage-list-count"]').text()).toContain('2 cases')

    const items = wrapper.findAll('.ns-triage-item')
    expect(items).toHaveLength(2)

    const first = items[0]
    expect(first.text()).toContain('GRV-2026-TR01')
    expect(first.text()).toContain('Waiting 2 h')
    expect(first.text()).toContain('Solid Waste & Garbage')
    expect(first.text()).toContain('Zone A')
    expect(first.classes()).toContain('ns-triage-item--selected')
    expect(first.attributes('aria-selected')).toBe('true')
  })

  it('formats confidence meter with red tone below 50% and amber tone at or above 50%', () => {
    const wrapper = mount(TriageList, {
      props: {
        items: MOCK_PENDING_ITEMS,
        status: 'pending',
        total: 2,
      },
    })

    const items = wrapper.findAll('.ns-triage-item')

    // Item 1: 58% (amber tone)
    const meter1 = items[0].get('.ns-meter-track')
    expect(meter1.classes()).toContain('ns-meter-track--amber')
    expect(items[0].get('.ns-meter-text').text()).toContain('58%')
    expect(items[0].get('.ns-meter-text').text()).toContain('(Moderate)')

    // Item 2: 46% (red tone)
    const meter2 = items[1].get('.ns-meter-track')
    expect(meter2.classes()).toContain('ns-meter-track--red')
    expect(items[1].get('.ns-meter-text').text()).toContain('46%')
    expect(items[1].get('.ns-meter-text').text()).toContain('(Low)')
  })

  it('emits select event when an item is clicked or triggered by keyboard', async () => {
    const wrapper = mount(TriageList, {
      props: {
        items: MOCK_PENDING_ITEMS,
        status: 'pending',
        total: 2,
      },
    })

    const items = wrapper.findAll('.ns-triage-item')
    await items[1].trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual([MOCK_PENDING_ITEMS[1]])

    await items[0].trigger('keydown.enter')
    expect(wrapper.emitted('select')[1]).toEqual([MOCK_PENDING_ITEMS[0]])
  })

  it('renders reviewed items with final category and reviewed timestamp', () => {
    const wrapper = mount(TriageList, {
      props: {
        items: MOCK_REVIEWED_ITEMS,
        status: 'reviewed',
        total: 1,
      },
    })

    expect(wrapper.get('.ns-card-title').text()).toBe('Reviewed cases')
    expect(wrapper.get('.ns-card-subtitle').text()).toBe('Most recently reviewed first')

    const item = wrapper.get('.ns-triage-item')
    expect(item.text()).toContain('GRV-2026-TR05')
    expect(item.text()).toContain('AI guess:')
    expect(item.text()).toContain('Final:')
    expect(item.text()).toContain('Reviewed')
  })

  it('displays appropriate empty state message for pending and reviewed tabs', async () => {
    const wrapper = mount(TriageList, {
      props: {
        items: [],
        status: 'pending',
        total: 0,
      },
    })

    expect(wrapper.get('[data-test="triage-list-empty"]').text()).toContain(
      'Nothing to review. Every complaint was classified with high confidence.',
    )

    await wrapper.setProps({ status: 'reviewed' })
    expect(wrapper.get('[data-test="triage-list-empty"]').text()).toContain('No reviewed cases yet.')
  })

  it('renders pagination controls and emits page-change when clicked', async () => {
    const wrapper = mount(TriageList, {
      props: {
        items: MOCK_PENDING_ITEMS,
        status: 'pending',
        total: 45,
        page: 1,
        pageSize: 20,
      },
    })

    const pagination = wrapper.get('[data-test="triage-pagination"]')
    expect(pagination.exists()).toBe(true)

    const nextBtn = pagination.findAll('.ns-page-nav-btn')[1]
    await nextBtn.trigger('click')

    expect(wrapper.emitted('page-change')).toBeTruthy()
    expect(wrapper.emitted('page-change')[0]).toEqual([2])
  })
})
