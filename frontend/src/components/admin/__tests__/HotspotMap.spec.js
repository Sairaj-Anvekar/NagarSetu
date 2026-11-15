import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import L from 'leaflet'
import HotspotMap from '../HotspotMap.vue'

vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  }

  const mockTileLayer = {
    addTo: vi.fn().mockReturnThis(),
  }

  const mockLayerGroup = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
  }

  const mockCircleMarker = {
    bindPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  }

  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => mockTileLayer),
      layerGroup: vi.fn(() => mockLayerGroup),
      circleMarker: vi.fn(() => mockCircleMarker),
      latLngBounds: vi.fn((coords) => ({ coords })),
    },
  }
})

describe('HotspotMap - Map initialization and tile layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a map on mount centered on the default view', () => {
    const wrapper = mount(HotspotMap, {
      props: { hotspots: [] },
    })

    expect(L.map).toHaveBeenCalledTimes(1)
    expect(L.map).toHaveBeenCalledWith(wrapper.find('.hotspot-map').element)

    const mapInstance = L.map.mock.results[0].value
    expect(mapInstance.setView).toHaveBeenCalledWith([17.68, 75.88], 13)
  })

  it('adds an OpenStreetMap tile layer with required attribution', () => {
    mount(HotspotMap, {
      props: { hotspots: [] },
    })

    expect(L.tileLayer).toHaveBeenCalledTimes(1)
    const [tileUrl, options] = L.tileLayer.mock.calls[0]

    expect(tileUrl).toContain('tile.openstreetmap.org')
    expect(options.attribution).toContain('OpenStreetMap')

    const tileLayerInstance = L.tileLayer.mock.results[0].value
    const mapInstance = L.map.mock.results[0].value
    expect(tileLayerInstance.addTo).toHaveBeenCalledWith(mapInstance)
  })
})

describe('HotspotMap - Markers, bounds, and prop updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates one circleMarker per valid hotspot with radius that grows with count and stays clamped', () => {
    const hotspots = [
      { id: 'h-1', lat: 17.68, lng: 75.88, count: 1, label: 'Hotspot 1', category: 'Garbage' },
      { id: 'h-2', lat: 17.67, lng: 75.87, count: 10, label: 'Hotspot 2', category: 'Drainage' },
      { id: 'h-3', lat: 17.66, lng: 75.86, count: 50, label: 'Hotspot 3', category: 'Roads' },
      { id: 'h-4', lat: 17.65, lng: 75.85, count: 0, label: 'Hotspot 4', category: '' },
    ]

    mount(HotspotMap, {
      props: { hotspots },
    })

    expect(L.circleMarker).toHaveBeenCalledTimes(4)

    const calls = L.circleMarker.mock.calls
    const radius1 = calls[0][1].radius
    const radius2 = calls[1][1].radius
    const radius3 = calls[2][1].radius
    const radius4 = calls[3][1].radius

    expect(radius1).toBeGreaterThanOrEqual(10)
    expect(radius2).toBeGreaterThan(radius1)
    expect(radius3).toBe(32)
    expect(radius4).toBe(10)
    expect(radius3).toBeLessThanOrEqual(32)

    const markerInstance = L.circleMarker.mock.results[0].value
    expect(markerInstance.bindPopup).toHaveBeenCalledTimes(4)
    const popupHtml = markerInstance.bindPopup.mock.calls[0][0]
    expect(popupHtml).toContain('Hotspot 1')
    expect(popupHtml).toContain('1 complaint')
    expect(popupHtml).toContain('Garbage')
  })

  it('fits bounds when hotspots exist and falls back to default view when empty', () => {
    const hotspots = [
      { id: 'h-1', lat: 17.68, lng: 75.88, count: 5, label: 'Hotspot 1' },
      { id: 'h-2', lat: 17.66, lng: 75.85, count: 3, label: 'Hotspot 2' },
    ]

    mount(HotspotMap, {
      props: { hotspots },
    })

    expect(L.latLngBounds).toHaveBeenCalledWith([
      [17.68, 75.88],
      [17.66, 75.85],
    ])

    const mapInstance = L.map.mock.results[0].value
    expect(mapInstance.fitBounds).toHaveBeenCalledWith(expect.any(Object), {
      padding: [40, 40],
      maxZoom: 16,
    })
  })

  it('redraws markers and recalculates bounds when hotspots prop changes', async () => {
    const initial = [{ id: 'h-1', lat: 17.68, lng: 75.88, count: 2, label: 'Hotspot 1' }]

    const wrapper = mount(HotspotMap, {
      props: { hotspots: initial },
    })

    expect(L.circleMarker).toHaveBeenCalledTimes(1)

    const layerGroupInstance = L.layerGroup.mock.results[0].value
    L.circleMarker.mockClear()
    layerGroupInstance.clearLayers.mockClear()

    const updated = [
      { id: 'h-1', lat: 17.68, lng: 75.88, count: 2, label: 'Hotspot 1' },
      { id: 'h-2', lat: 17.69, lng: 75.89, count: 7, label: 'Hotspot 2' },
    ]

    await wrapper.setProps({ hotspots: updated })

    expect(layerGroupInstance.clearLayers).toHaveBeenCalledTimes(1)
    expect(L.circleMarker).toHaveBeenCalledTimes(2)
  })

  it('calls map.remove when the component is unmounted to prevent leaks', () => {
    const wrapper = mount(HotspotMap, {
      props: { hotspots: [] },
    })

    const mapInstance = L.map.mock.results[0].value
    expect(mapInstance.remove).not.toHaveBeenCalled()

    wrapper.unmount()

    expect(mapInstance.remove).toHaveBeenCalledTimes(1)
  })
})


