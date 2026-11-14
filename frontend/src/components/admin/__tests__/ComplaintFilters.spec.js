import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplaintFilters from '../ComplaintFilters.vue'

describe('ComplaintFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const sampleProps = {
    filters: {
      q: '',
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
    },
    categories: ['Garbage Dump', 'Dead Animal'],
    zones: [
      { id: '1', name: 'Zone A' },
      { id: '2', name: 'Zone B' },
    ],
  }

  it('renders all filter controls with accessible labels', () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })

    const searchLabel = wrapper.find('label[for="complaint-filter-search"]')
    expect(searchLabel.exists()).toBe(true)
    expect(searchLabel.text()).toBe('Search')
    expect(wrapper.find('#complaint-filter-search').exists()).toBe(true)

    const statusLabel = wrapper.find('label[for="complaint-filter-status"]')
    expect(statusLabel.exists()).toBe(true)
    expect(statusLabel.text()).toBe('Status')
    expect(wrapper.find('#complaint-filter-status').exists()).toBe(true)

    const categoryLabel = wrapper.find('label[for="complaint-filter-category"]')
    expect(categoryLabel.exists()).toBe(true)
    expect(categoryLabel.text()).toBe('Category')
    expect(wrapper.find('#complaint-filter-category').exists()).toBe(true)

    const zoneLabel = wrapper.find('label[for="complaint-filter-zone"]')
    expect(zoneLabel.exists()).toBe(true)
    expect(zoneLabel.text()).toBe('Zone')
    expect(wrapper.find('#complaint-filter-zone').exists()).toBe(true)

    const overdueLabel = wrapper.find('label[for="complaint-filter-overdue"]')
    expect(overdueLabel.exists()).toBe(true)
    expect(overdueLabel.text()).toBe('Overdue only')
    expect(wrapper.find('#complaint-filter-overdue').exists()).toBe(true)

    const unassignedLabel = wrapper.find('label[for="complaint-filter-unassigned"]')
    expect(unassignedLabel.exists()).toBe(true)
    expect(unassignedLabel.text()).toBe('Unassigned only')
    expect(wrapper.find('#complaint-filter-unassigned').exists()).toBe(true)
  })

  it('renders dynamic categories and zones in selects', () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })

    const categoryOptions = wrapper.findAll('#complaint-filter-category option')
    expect(categoryOptions.map((o) => o.text())).toEqual([
      'All categories',
      'Garbage Dump',
      'Dead Animal',
    ])

    const zoneOptions = wrapper.findAll('#complaint-filter-zone option')
    expect(zoneOptions.map((o) => o.text())).toEqual(['All zones', 'Zone A', 'Zone B'])
  })

  it('emits update when status, category, or zone changes', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })

    await wrapper.find('#complaint-filter-status').setValue('Submitted')
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0]).toMatchObject({ status: 'Submitted' })

    await wrapper.find('#complaint-filter-category').setValue('Garbage Dump')
    expect(wrapper.emitted('update')).toHaveLength(2)
    expect(wrapper.emitted('update')[1][0]).toMatchObject({ category: 'Garbage Dump' })

    await wrapper.find('#complaint-filter-zone').setValue('1')
    expect(wrapper.emitted('update')).toHaveLength(3)
    expect(wrapper.emitted('update')[2][0]).toMatchObject({ zoneId: '1' })
  })

  it('emits update when overdue and unassigned checkboxes change', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })

    await wrapper.find('#complaint-filter-overdue').setValue(true)
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0]).toMatchObject({ overdue: true })

    await wrapper.find('#complaint-filter-unassigned').setValue(true)
    expect(wrapper.emitted('update')).toHaveLength(2)
    expect(wrapper.emitted('update')[1][0]).toMatchObject({ unassigned: true })
  })

  it('debounces search input by 300ms', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })
    const searchInput = wrapper.find('#complaint-filter-search')

    await searchInput.setValue('waste')
    expect(wrapper.emitted('update')).toBeUndefined()

    vi.advanceTimersByTime(200)
    expect(wrapper.emitted('update')).toBeUndefined()

    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0]).toMatchObject({ q: 'waste' })
  })

  it('emits immediately when Enter is pressed in search input', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })
    const searchInput = wrapper.find('#complaint-filter-search')

    await searchInput.setValue('urgent')
    expect(wrapper.emitted('update')).toBeUndefined()

    await searchInput.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0]).toMatchObject({ q: 'urgent' })

    // Advancing timers should not cause a second emit
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('update')).toHaveLength(1)
  })

  it('limits search input length to 100 characters', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })
    const searchInput = wrapper.find('#complaint-filter-search')

    expect(searchInput.attributes('maxlength')).toBe('100')

    const longQuery = 'a'.repeat(120)
    await searchInput.setValue(longQuery)
    await searchInput.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0].q).toHaveLength(100)
  })

  it('shows Clear filters only when active, and resets all filters on click', async () => {
    const wrapper = mount(ComplaintFilters, {
      props: {
        ...sampleProps,
        filters: { ...sampleProps.filters, overdue: true },
      },
    })

    const clearBtn = wrapper.find('button.ns-clear-btn')
    expect(clearBtn.exists()).toBe(true)
    expect(clearBtn.text()).toBe('Clear filters')

    await clearBtn.trigger('click')
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')[0][0]).toEqual({
      q: '',
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
    })
  })

  it('does not show Clear filters when no filters are active', () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })
    expect(wrapper.find('button.ns-clear-btn').exists()).toBe(false)
  })

  it('synchronizes search input when filters.q changes externally', async () => {
    const wrapper = mount(ComplaintFilters, { props: sampleProps })
    const searchInput = wrapper.find('#complaint-filter-search')

    expect(searchInput.element.value).toBe('')

    await wrapper.setProps({
      filters: { ...sampleProps.filters, q: 'external-code' },
    })

    expect(searchInput.element.value).toBe('external-code')
  })
})
