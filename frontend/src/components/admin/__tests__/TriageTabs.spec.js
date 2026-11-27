import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TriageTabs from '../TriageTabs.vue'

describe('TriageTabs', () => {
  it('renders Pending and Reviewed tabs with accessible tablist roles', () => {
    const wrapper = mount(TriageTabs, {
      props: { modelValue: 'pending' },
    })

    const tablist = wrapper.get('[role="tablist"]')
    expect(tablist.attributes('aria-label')).toBe('Triage status tabs')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].text()).toContain('Pending')
    expect(tabs[1].text()).toContain('Reviewed')
  })

  it('marks active tab with aria-selected="true" and active class', async () => {
    const wrapper = mount(TriageTabs, {
      props: { modelValue: 'pending' },
    })

    const pendingTab = wrapper.get('[data-test="tab-pending"]')
    const reviewedTab = wrapper.get('[data-test="tab-reviewed"]')

    expect(pendingTab.attributes('aria-selected')).toBe('true')
    expect(pendingTab.classes()).toContain('ns-triage-tab--active')
    expect(reviewedTab.attributes('aria-selected')).toBe('false')

    await wrapper.setProps({ modelValue: 'reviewed' })

    expect(pendingTab.attributes('aria-selected')).toBe('false')
    expect(reviewedTab.attributes('aria-selected')).toBe('true')
    expect(reviewedTab.classes()).toContain('ns-triage-tab--active')
  })

  it('emits update:modelValue when a tab is clicked', async () => {
    const wrapper = mount(TriageTabs, {
      props: { modelValue: 'pending' },
    })

    await wrapper.get('[data-test="tab-reviewed"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['reviewed'])
  })

  it('displays count badges when counts are provided and hides them when null', async () => {
    const wrapper = mount(TriageTabs, {
      props: {
        modelValue: 'pending',
        pendingCount: 4,
        reviewedCount: null,
      },
    })

    expect(wrapper.get('[data-test="pending-count"]').text()).toBe('4')
    expect(wrapper.find('[data-test="reviewed-count"]').exists()).toBe(false)

    await wrapper.setProps({ reviewedCount: 12 })
    expect(wrapper.get('[data-test="reviewed-count"]').text()).toBe('12')
  })
})
