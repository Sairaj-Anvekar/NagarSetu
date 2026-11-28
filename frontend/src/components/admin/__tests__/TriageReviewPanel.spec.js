import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TriageReviewPanel from '../TriageReviewPanel.vue'

const MOCK_ITEM = {
  id: 'trg-101',
  tracking_code: 'GRV-2026-TR01',
  predicted_category: 'Solid Waste & Garbage',
  ai_confidence: 0.58,
  status: 'pending',
  description: 'Overflowing garbage bin near market',
  image_url: 'https://images.local/triage.jpg',
  zone: 'Zone A',
  classifier_source: 'image',
}

describe('TriageReviewPanel', () => {
  it('renders placeholder message when no item is selected', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: { item: null },
    })

    expect(wrapper.get('[data-test="review-placeholder"]').text()).toContain(
      'Select a case from the list to review.',
    )
  })

  it('renders case header, zone chip, safe description, and AI suggestion box', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: { item: MOCK_ITEM },
    })

    expect(wrapper.get('.ns-review-title').text()).toContain('GRV-2026-TR01')
    expect(wrapper.get('[data-test="review-zone-chip"]').text()).toBe('Zone A')
    expect(wrapper.get('.ns-review-desc').text()).toBe('Overflowing garbage bin near market')

    const suggestion = wrapper.get('[data-test="ai-suggestion-box"]')
    expect(suggestion.text()).toContain('Solid Waste & Garbage')
    expect(suggestion.text()).toContain('58%')
    expect(suggestion.text()).toContain('Below 70%, so a person should confirm.')
    expect(suggestion.text()).toContain('Source: Image model')
  })

  it('renders photo image when image_url is present', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: { item: MOCK_ITEM },
    })

    const img = wrapper.get('[data-test="review-photo"]')
    expect(img.attributes('src')).toBe('https://images.local/triage.jpg')
    expect(wrapper.find('[data-test="photo-empty"]').exists()).toBe(false)
  })

  it('displays empty photo state when image_url is null', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: {
        item: { ...MOCK_ITEM, image_url: null },
      },
    })

    expect(wrapper.find('[data-test="photo-empty"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="photo-empty"]').text()).toContain('No photo attached')
    expect(wrapper.find('[data-test="review-photo"]').exists()).toBe(false)
  })

  it('displays photo fallback message when image fails to load', async () => {
    const wrapper = mount(TriageReviewPanel, {
      props: { item: MOCK_ITEM },
    })

    const img = wrapper.get('[data-test="review-photo"]')
    await img.trigger('error')

    expect(wrapper.find('[data-test="photo-fallback"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="photo-fallback"]').text()).toContain(
      'Photo unavailable. Reload the page to get a fresh link.',
    )
    expect(wrapper.find('[data-test="review-photo"]').exists()).toBe(false)
  })

  it('in pending mode: renders category picker, team move note, and confirm button', async () => {
    const wrapper = mount(TriageReviewPanel, {
      props: {
        item: MOCK_ITEM,
        status: 'pending',
      },
    })

    expect(wrapper.find('[data-test="pending-actions"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="move-note"]').text()).toContain(
      'Choosing a category from another department moves this complaint to that team.',
    )

    const confirmBtn = wrapper.get('[data-test="confirm-btn"]')
    expect(confirmBtn.text()).toBe('Confirm category')
    expect(confirmBtn.attributes('disabled')).toBeUndefined()

    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')[0]).toEqual([
      { id: 'trg-101', category: 'Solid Waste & Garbage' },
    ])
  })

  it('disables confirm button while submitting and displays spinner', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: {
        item: MOCK_ITEM,
        status: 'pending',
        isSubmitting: true,
      },
    })

    const confirmBtn = wrapper.get('[data-test="confirm-btn"]')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
    expect(confirmBtn.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
  })

  it('in reviewed mode: displays read-only summary with no picker or confirm button', () => {
    const wrapper = mount(TriageReviewPanel, {
      props: {
        item: {
          ...MOCK_ITEM,
          status: 'reviewed',
          final_category: 'Potholes & Road Damage',
          reviewed_at: '2026-11-26T15:30:00Z',
        },
        status: 'reviewed',
      },
    })

    expect(wrapper.find('[data-test="pending-actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="confirm-btn"]').exists()).toBe(false)

    const summary = wrapper.get('[data-test="reviewed-summary"]')
    expect(summary.text()).toContain('Potholes & Road Damage')
    expect(summary.text()).toContain('Public Works Department')
    expect(summary.text()).toContain('Reviewed:')
  })

  it('renders zone chip cleanly when item has object zone { id, name }', () => {
    const itemWithObjectZone = {
      ...MOCK_ITEM,
      zone: { id: 'z1', name: 'Zone A' },
    }

    const wrapper = mount(TriageReviewPanel, {
      props: { item: itemWithObjectZone },
    })

    const chip = wrapper.find('[data-test="review-zone-chip"]')
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toBe('Zone A')
    expect(wrapper.text()).not.toContain('[object Object]')
    expect(wrapper.text()).not.toContain('{')
  })
})
