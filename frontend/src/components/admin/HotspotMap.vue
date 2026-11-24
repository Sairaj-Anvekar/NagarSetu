<script setup>
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildHotspotPopupHtml, rankHotspots } from '../../utils/hotspotRanking'

const props = defineProps({
  hotspots: {
    type: Array,
    default: () => [],
  },
  selectedHotspotId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['select'])

const mapContainer = ref(null)
const mapInstance = shallowRef(null)
const markersLayer = shallowRef(null)
const markersById = new Map()
let resizeObserver = null

const DEFAULT_CENTER = [17.68, 75.88]
const DEFAULT_ZOOM = 13

function calculateRadius(count) {
  const numericCount = typeof count === 'number' && !Number.isNaN(count) && count > 0 ? count : 0
  const MIN_RADIUS = 10
  const MAX_RADIUS = 32
  const scaled = MIN_RADIUS + Math.min(MAX_RADIUS - MIN_RADIUS, numericCount * 1.5)
  return Math.round(scaled)
}

function renderMarkers(hotspots) {
  if (!mapInstance.value || !markersLayer.value) {
    return
  }

  markersLayer.value.clearLayers()
  markersById.clear()

  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    mapInstance.value.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    return
  }

  // Pre-calculate rank map by count descending while preserving original hotspot iteration order
  const ranked = rankHotspots(hotspots)
  const rankMap = new Map(ranked.map((h) => [String(h.id), h.rank]))

  const validCoords = []

  hotspots.forEach((hotspot, idx) => {
    const lat = Number(hotspot?.lat ?? hotspot?.latitude)
    const lng = Number(hotspot?.lng ?? hotspot?.longitude)

    if (Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
      return
    }

    validCoords.push([lat, lng])

    const rank = rankMap.get(String(hotspot?.id)) || idx + 1
    const radius = calculateRadius(hotspot?.count)
    const isSelected =
      props.selectedHotspotId !== null &&
      props.selectedHotspotId !== undefined &&
      String(props.selectedHotspotId) === String(hotspot.id)

    // Radius circle marker with translucent teal styling
    const circle = L.circleMarker([lat, lng], {
      radius,
      color: '#0B7285',
      weight: isSelected ? 2.5 : 1.5,
      fillColor: '#2DD4BF',
      fillOpacity: isSelected ? 0.38 : 0.22,
    })

    const popupHtml = buildHotspotPopupHtml(hotspot, rank)
    circle.bindPopup(popupHtml)

    circle.on('click', () => {
      emit('select', hotspot.id)
    })
    circle.addTo(markersLayer.value)

    let pinMarker = null
    // Add custom numbered Leaflet pin if marker and divIcon are supported
    if (typeof L.marker === 'function' && typeof L.divIcon === 'function') {
      const pinIcon = L.divIcon({
        className: 'ns-hotspot-pin-wrapper',
        html: `<div class="ns-hotspot-pin ${isSelected ? 'ns-hotspot-pin--selected' : ''}" aria-label="Hotspot rank ${rank}"><span class="ns-hotspot-pin__rank">${rank}</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      })

      const labelText = hotspot.label || `Hotspot ${rank}`
      pinMarker = L.marker([lat, lng], {
        icon: pinIcon,
        keyboard: true,
        title: `${labelText} (#${rank})`,
      })

      pinMarker.bindPopup(popupHtml)
      pinMarker.on('click', () => {
        emit('select', hotspot.id)
      })
      pinMarker.addTo(markersLayer.value)
    }

    markersById.set(String(hotspot.id), {
      circle,
      pinMarker,
      lat,
      lng,
      rank,
      popupHtml,
    })
  })

  if (validCoords.length > 0) {
    const bounds = L.latLngBounds(validCoords)
    mapInstance.value.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  } else {
    mapInstance.value.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  }
}

watch(
  () => props.hotspots,
  (newHotspots) => {
    renderMarkers(newHotspots)
  },
  { deep: true },
)

watch(
  () => props.selectedHotspotId,
  (newId) => {
    if (newId === null || newId === undefined || newId === '') {
      return
    }
    const target = markersById.get(String(newId))
    if (target && mapInstance.value) {
      if (typeof mapInstance.value.setView === 'function') {
        const currentZoom =
          typeof mapInstance.value.getZoom === 'function' ? mapInstance.value.getZoom() : 13
        mapInstance.value.setView([target.lat, target.lng], Math.max(currentZoom, 14), {
          animate: true,
        })
      }
      if (target.pinMarker && typeof target.pinMarker.openPopup === 'function') {
        target.pinMarker.openPopup()
      } else if (target.circle && typeof target.circle.openPopup === 'function') {
        target.circle.openPopup()
      }
    }
    // Re-render to update the selected pin style
    renderMarkers(props.hotspots)
  },
)

onMounted(() => {
  if (!mapContainer.value) {
    return
  }

  const map = L.map(mapContainer.value).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  const layerGroup = L.layerGroup().addTo(map)
  markersLayer.value = layerGroup
  mapInstance.value = map

  renderMarkers(props.hotspots)

  if (typeof ResizeObserver !== 'undefined' && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (mapInstance.value && typeof mapInstance.value.invalidateSize === 'function') {
        mapInstance.value.invalidateSize()
      }
    })
    resizeObserver.observe(mapContainer.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
  markersLayer.value = null
  markersById.clear()
})
</script>

<template>
  <div class="hotspot-map-wrapper">
    <div
      ref="mapContainer"
      class="hotspot-map"
      role="region"
      aria-label="Complaint hotspots map"
    />
  </div>
</template>

<style scoped>
.hotspot-map-wrapper {
  position: relative;
  width: 100%;
  height: 520px;
  border-radius: var(--ns-hotspot-card-radius, 18px);
  border: 1px solid var(--ns-hotspot-card-border, #E3EAF0);
  background-color: var(--ns-paper, #FFFFFF);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  overflow: hidden;
}

.hotspot-map {
  width: 100%;
  height: 100%;
  min-height: 280px;
  background-color: var(--ns-surface-2, #F8FAFC);
  position: relative;
  z-index: 0;
}

:deep(.leaflet-popup-content-wrapper) {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(14, 34, 51, 0.15);
  padding: 0;
  overflow: hidden;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  padding: 12px 14px;
  font-family: var(--ns-font-body, system-ui, sans-serif);
  line-height: 1.4;
  color: #0E2233;
}

:deep(.ns-hotspot-popup) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.ns-hotspot-popup__header) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.ns-hotspot-popup__rank) {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
  font-size: 0.8125rem;
  color: #0B7285;
}

:deep(.ns-hotspot-popup__title) {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0;
  color: #0E2233;
}

:deep(.ns-hotspot-popup__count) {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0B7285;
}

:deep(.ns-hotspot-popup__badges) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

:deep(.ns-hotspot-popup__badge) {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

:deep(.ns-hotspot-popup__badge--zone) {
  background-color: #EFF6FF;
  color: #1D4ED8;
  border: 1px solid #DBEAFE;
}

:deep(.ns-hotspot-popup__badge--cat) {
  background-color: #F1F5F9;
  color: #475569;
  border: 1px solid #E2E8F0;
}

:deep(.ns-hotspot-pin-wrapper) {
  background: transparent;
  border: none;
}

:deep(.ns-hotspot-pin) {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  border: 2px solid #FFFFFF;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.35);
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
  user-select: none;
}

:deep(.ns-hotspot-pin:hover) {
  transform: scale(1.15);
  box-shadow: 0 4px 14px rgba(11, 114, 133, 0.5);
}

:deep(.ns-hotspot-pin--selected) {
  background: #0E2233 !important;
  border-color: #2DD4BF !important;
  transform: scale(1.22);
  box-shadow:
    0 0 0 4px rgba(45, 212, 191, 0.4),
    0 4px 14px rgba(14, 34, 51, 0.5) !important;
  z-index: 1000;
}

@media (max-width: 991.98px) {
  .hotspot-map-wrapper {
    height: 360px;
  }
}

@media (max-width: 576px) {
  .hotspot-map-wrapper {
    height: 300px;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.ns-hotspot-pin) {
    transition: none;
  }
}
</style>
