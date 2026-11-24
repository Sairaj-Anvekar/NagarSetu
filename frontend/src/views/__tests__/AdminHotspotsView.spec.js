import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount as baseMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminHotspotsView from '../AdminHotspotsView.vue'
import PageHeader from '../../components/PageHeader.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import ErrorAlert from '../../components/ErrorAlert.vue'
import EmptyState from '../../components/EmptyState.vue'
import HotspotList from '../../components/admin/HotspotList.vue'
import HotspotMap from '../../components/admin/HotspotMap.vue'
import * as adminApi from '../../api/adminApi'

vi.mock('../../api/adminApi')

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/hotspots',
        name: 'admin-hotspots',
        component: AdminHotspotsView,
      },
    ],
  })
}

async function mountView(initialQuery = {}) {
  const router = createTestRouter()
  const queryString = new URLSearchParams(initialQuery).toString()
  const initialPath = queryString ? `/admin/hotspots?${queryString}` : '/admin/hotspots'
  await router.push(initialPath)
  await router.isReady()

  const wrapper = baseMount(AdminHotspotsView, {
    global: {
      plugins: [router],
      stubs: {
        HotspotMap: {
          name: 'HotspotMap',
          props: ['hotspots', 'selectedHotspotId'],
          emits: ['select'],
          template: '<div class="stubbed-hotspot-map" />',
        },
      },
    },
  })

  return { wrapper, router }
}

describe('AdminHotspotsView — header and layout styling', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [{ category: 'Garbage Dump', count: 12 }],
      by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchHotspots').mockResolvedValue({ items: [] })
  })

  it('renders PageHeader with updated title and volume ranking subtitle', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const pageHeader = wrapper.findComponent(PageHeader)
    expect(pageHeader.exists()).toBe(true)
    expect(pageHeader.props('title')).toBe('Hotspots')
    expect(pageHeader.props('subtitle')).toBe(
      'Areas with repeated complaints, ranked by volume'
    )
  })

  it('renders filters section inside an accessible card container', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const filtersSection = wrapper.find('section.admin-hotspots__filters')
    expect(filtersSection.exists()).toBe(true)
    expect(filtersSection.attributes('aria-label')).toBe('Hotspots filters')
  })
})

describe('AdminHotspotsView — loading, error, 403, and empty states', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [
        { category: 'Garbage Dump', count: 12 },
        { category: 'Drainage', count: 4 },
      ],
      by_zone: [],
    })
  })

  it('shows loading spinner while initial fetch is pending', async () => {
    let resolveHotspots
    vi.spyOn(adminApi, 'fetchHotspots').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHotspots = resolve
        }),
    )

    const { wrapper } = await mountView()

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
    expect(wrapper.findComponent(LoadingSpinner).props('label')).toBe('Loading hotspots...')

    resolveHotspots({ items: [] })
    await flushPromises()

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(false)
  })

  it('displays error alert with retry button on network failure and retries fetch when clicked', async () => {
    vi.spyOn(adminApi, 'fetchHotspots').mockRejectedValueOnce(new Error('Network disconnected'))

    const { wrapper } = await mountView()
    await flushPromises()

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Failed to load complaint hotspots.')

    vi.spyOn(adminApi, 'fetchHotspots').mockResolvedValueOnce({
      items: [
        {
          id: '1',
          lat: 17.68,
          lng: 75.88,
          count: 5,
          label: 'Hotspot 1',
          category: 'Garbage Dump',
        },
      ],
    })

    const retryBtn = errorAlert.find('button')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(ErrorAlert).exists()).toBe(false)
    expect(adminApi.fetchHotspots).toHaveBeenCalledTimes(2)
  })

  it('displays 403 permission error message when request is forbidden', async () => {
    const error403 = new Error('Request failed with status code 403')
    error403.response = { status: 403, data: {} }

    vi.spyOn(adminApi, 'fetchHotspots').mockRejectedValueOnce(error403)

    const { wrapper } = await mountView()
    await flushPromises()

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('You do not have permission to do this.')
  })

  it('displays empty state when server returns no hotspots', async () => {
    vi.spyOn(adminApi, 'fetchHotspots').mockResolvedValueOnce({ items: [] })

    const { wrapper } = await mountView()
    await flushPromises()

    const emptyState = wrapper.findComponent(EmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No hotspots found')
    expect(emptyState.text()).toContain('No complaint clusters match the selected criteria.')
  })
})

describe('AdminHotspotsView — days selector, category filtering, and stats resilience', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [
        { category: 'Garbage Dump', count: 12 },
        { category: 'Drainage', count: 4 },
      ],
      by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchHotspots').mockResolvedValue({
      items: [
        {
          id: '1',
          lat: 17.68,
          lng: 75.88,
          count: 5,
          label: 'Hotspot 1',
          category: 'Garbage Dump',
        },
      ],
    })
  })

  it('updates aria-pressed and refetches when days range button is clicked', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const buttons = wrapper.findAll('.days-btn')
    expect(buttons).toHaveLength(3)

    const btn7 = buttons[0]
    const btn14 = buttons[1]
    const btn30 = buttons[2]

    expect(btn30.attributes('aria-pressed')).toBe('true')
    expect(btn30.classes()).toContain('btn-primary')
    expect(btn7.attributes('aria-pressed')).toBe('false')
    expect(btn14.attributes('aria-pressed')).toBe('false')

    expect(adminApi.fetchHotspots).toHaveBeenCalledWith({ days: 30, category: '' })

    await btn7.trigger('click')
    await flushPromises()

    expect(btn7.attributes('aria-pressed')).toBe('true')
    expect(btn7.classes()).toContain('btn-primary')
    expect(btn30.attributes('aria-pressed')).toBe('false')
    expect(adminApi.fetchHotspots).toHaveBeenCalledWith({ days: 7, category: '' })

    // Clicking already selected button does not refetch
    await btn7.trigger('click')
    expect(adminApi.fetchHotspots).toHaveBeenCalledTimes(2)
  })

  it('populates categories from fetchStats and refetches when category changes', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const select = wrapper.find('select#hotspots-category-select')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options.map((opt) => opt.text())).toEqual([
      'All categories',
      'Garbage Dump',
      'Drainage',
    ])

    await select.setValue('Drainage')
    await flushPromises()

    expect(adminApi.fetchHotspots).toHaveBeenCalledWith({ days: 30, category: 'Drainage' })
  })

  it('still functions with "All categories" when fetchStats fails', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockRejectedValueOnce(new Error('Stats service unavailable'))

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.findComponent(ErrorAlert).exists()).toBe(false)

    const select = wrapper.find('select#hotspots-category-select')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options).toHaveLength(1)
    expect(options[0].text()).toBe('All categories')

    expect(adminApi.fetchHotspots).toHaveBeenCalledWith({ days: 30, category: '' })
  })
})

describe('AdminHotspotsView — URL query synchronization and data passing', () => {
  const mockHotspots = [
    {
      id: '17.68_75.88',
      lat: 17.68,
      lng: 75.88,
      count: 15,
      label: 'Hotspot 1',
      category: 'Garbage Dump',
    },
    {
      id: '17.66_75.85',
      lat: 17.66,
      lng: 75.85,
      count: 6,
      label: 'Hotspot 2',
      category: 'Drainage',
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValue({
      by_category: [
        { category: 'Garbage Dump', count: 12 },
        { category: 'Drainage', count: 4 },
      ],
      by_zone: [],
    })
    vi.spyOn(adminApi, 'fetchHotspots').mockResolvedValue({ items: mockHotspots })
  })

  it('reads days and category from initial URL query parameters on mount', async () => {
    const { wrapper } = await mountView({ days: '14', category: 'Garbage Dump' })
    await flushPromises()

    expect(adminApi.fetchHotspots).toHaveBeenCalledWith({ days: 14, category: 'Garbage Dump' })

    const buttons = wrapper.findAll('.days-btn')
    expect(buttons[1].attributes('aria-pressed')).toBe('true')

    const select = wrapper.find('select#hotspots-category-select')
    expect(select.element.value).toBe('Garbage Dump')
  })

  it('updates URL query via router.replace omitting default days and empty category', async () => {
    const { wrapper, router } = await mountView()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})

    // Changing days to 7 updates URL query
    const btn7 = wrapper.findAll('.days-btn')[0]
    await btn7.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ days: '7' })

    // Changing category to Drainage appends to URL query
    const select = wrapper.find('select#hotspots-category-select')
    await select.setValue('Drainage')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ days: '7', category: 'Drainage' })

    // Reverting days to default 30 removes days from URL query
    const btn30 = wrapper.findAll('.days-btn')[2]
    await btn30.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ category: 'Drainage' })

    // Reverting category to all removes category from URL query
    await select.setValue('')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('passes loaded hotspot data to HotspotMap and renders HotspotList', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const mapComponent = wrapper.findComponent(HotspotMap)
    expect(mapComponent.exists()).toBe(true)
    expect(mapComponent.props('hotspots')).toEqual(mockHotspots)

    const listComponent = wrapper.findComponent(HotspotList)
    expect(listComponent.exists()).toBe(true)
    expect(listComponent.props('hotspots')).toEqual(mockHotspots)

    const renderedText = listComponent.text()
    expect(renderedText).toContain('Hotspot 1')
    expect(renderedText).toContain('15')
    expect(renderedText).toContain('complaints')
    expect(renderedText).toContain('Garbage Dump')
    expect(renderedText).toContain('Hotspot 2')
    expect(renderedText).toContain('6')
  })

  it('coordinates selection between map and list and resets selection on filter change', async () => {
    const { wrapper } = await mountView()
    await flushPromises()

    const mapComponent = wrapper.findComponent(HotspotMap)
    const listComponent = wrapper.findComponent(HotspotList)

    expect(mapComponent.props('selectedHotspotId')).toBe('')
    expect(listComponent.props('selectedHotspotId')).toBe('')

    // Selecting from list updates map prop
    await listComponent.vm.$emit('select', '17.68_75.88')
    await flushPromises()

    expect(mapComponent.props('selectedHotspotId')).toBe('17.68_75.88')
    expect(listComponent.props('selectedHotspotId')).toBe('17.68_75.88')

    // Selecting from map updates list prop
    await mapComponent.vm.$emit('select', '17.66_75.85')
    await flushPromises()

    expect(mapComponent.props('selectedHotspotId')).toBe('17.66_75.85')
    expect(listComponent.props('selectedHotspotId')).toBe('17.66_75.85')
  })
})


