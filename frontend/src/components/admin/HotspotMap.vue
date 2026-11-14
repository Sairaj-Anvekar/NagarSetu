<script setup>
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  hotspots: {
    type: Array,
    default: () => [],
  },
})

const mapContainer = ref(null)
const mapInstance = shallowRef(null)
const markersLayer = shallowRef(null)

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

  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    mapInstance.value.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    return
  }

  const validCoords = []

  hotspots.forEach((hotspot) => {
    const lat = Number(hotspot?.lat ?? hotspot?.latitude)
    const lng = Number(hotspot?.lng ?? hotspot?.longitude)

    if (Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
      return
    }

    validCoords.push([lat, lng])

    const radius = calculateRadius(hotspot?.count)
    const marker = L.circleMarker([lat, lng], {
      radius,
      color: '#B54708',
      weight: 2,
      fillColor: '#B54708',
      fillOpacity: 0.35,
    })

    const countText = `${hotspot.count} ${hotspot.count === 1 ? 'complaint' : 'complaints'}`
    const labelText = hotspot.label || 'Hotspot'
    const categoryHtml = hotspot.category ? `<br/><span>${hotspot.category}</span>` : ''

    marker.bindPopup(`<strong>${labelText}</strong><br/>${countText}${categoryHtml}`)
    marker.addTo(markersLayer.value)
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
  { deep: true }
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
})

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.remove()
    mapInstance.value = null
  }
  markersLayer.value = null
})
</script>

<template>
  <div
    ref="mapContainer"
    class="hotspot-map"
    role="region"
    aria-label="Complaint hotspots map"
  />
</template>

<style scoped>
.hotspot-map {
  width: 100%;
  height: 480px;
  min-height: 280px;
  border-radius: var(--ns-radius-card);
  border: 1px solid var(--ns-line);
  background-color: var(--ns-surface-2);
  position: relative;
  z-index: 0;
}

@media (max-width: 768px) {
  .hotspot-map {
    height: 360px;
  }
}

@media (max-width: 576px) {
  .hotspot-map {
    height: 300px;
  }
}
</style>
