<script setup>
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { rankHotspots } from '../../utils/hotspotRanking'

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

const sortedHotspots = computed(() => {
  return rankHotspots(props.hotspots)
})

function handleSelect(hotspot) {
  if (hotspot?.id !== undefined && hotspot?.id !== null) {
    emit('select', hotspot.id)
  }
}

function formatZone(zone) {
  if (!zone) return ''
  if (typeof zone === 'object' && typeof zone.name === 'string') {
    return zone.name.trim()
  }
  if (typeof zone === 'string') {
    return zone.trim()
  }
  return ''
}
</script>

<template>
  <div class="hotspot-list-card">
    <div class="hotspot-list-card__header">
      <div class="hotspot-list-card__title-row">
        <h3 class="hotspot-list-card__title">Top hotspots</h3>
        <span v-if="sortedHotspots.length > 0" class="hotspot-list-card__badge">
          {{ sortedHotspots.length }} {{ sortedHotspots.length === 1 ? 'area' : 'areas' }}
        </span>
      </div>
      <p class="hotspot-list-card__subtitle">Ranked by volume of reported issues</p>
    </div>

    <div class="hotspot-list">
      <div v-if="sortedHotspots.length === 0" class="hotspot-list__empty">
        <EmptyState
          title="No hotspots found"
          message="No complaint clusters match the selected filters."
        />
      </div>

      <ul v-else class="hotspot-list__items" role="list">
        <li
          v-for="(hotspot, index) in sortedHotspots"
          :key="hotspot.id || index"
          class="hotspot-list__item"
          :class="{
            'hotspot-list__item--selected':
              selectedHotspotId !== null &&
              selectedHotspotId !== undefined &&
              String(selectedHotspotId) === String(hotspot.id),
          }"
          role="button"
          tabindex="0"
          :aria-pressed="
            selectedHotspotId !== null &&
            selectedHotspotId !== undefined &&
            String(selectedHotspotId) === String(hotspot.id)
              ? 'true'
              : 'false'
          "
          @click="handleSelect(hotspot)"
          @keydown.enter.prevent="handleSelect(hotspot)"
          @keydown.space.prevent="handleSelect(hotspot)"
        >
          <div class="hotspot-list__item-header">
            <span class="hotspot-list__rank">#{{ hotspot.rank || index + 1 }}</span>
            <span class="hotspot-list__label">{{ hotspot.label || `Hotspot #${index + 1}` }}</span>
            <span class="hotspot-list__badge">
              <span class="hotspot-list__count">{{ hotspot.count }}</span>
              <span class="hotspot-list__count-unit">
                {{ hotspot.count === 1 ? 'complaint' : 'complaints' }}
              </span>
            </span>
          </div>

          <div v-if="formatZone(hotspot.zone) || hotspot.category" class="hotspot-list__tags">
            <div v-if="formatZone(hotspot.zone)" class="hotspot-list__zone">
              <span class="hotspot-list__zone-tag">{{ formatZone(hotspot.zone) }}</span>
            </div>
            <div v-if="hotspot.category" class="hotspot-list__category">
              <span class="hotspot-list__category-tag">{{ hotspot.category }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.hotspot-list-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 520px;
  background-color: var(--ns-paper, #FFFFFF);
  border: 1px solid var(--ns-hotspot-card-border, #E3EAF0);
  border-radius: var(--ns-hotspot-card-radius, 18px);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  overflow: hidden;
}

.hotspot-list-card__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--ns-line, #E3E8EE);
  background-color: #FFFFFF;
}

.hotspot-list-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hotspot-list-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--ns-ink, #0E2233);
  margin: 0;
}

.hotspot-list-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--ns-radius-pill, 999px);
  background-color: var(--ns-hotspot-badge-bg, #D8F1F3);
  color: var(--ns-hotspot-badge-fg, #0B6A7C);
  font-size: 0.75rem;
  font-weight: 700;
}

.hotspot-list-card__subtitle {
  font-size: 0.8125rem;
  color: var(--ns-slate, #5B6B7A);
  margin: 2px 0 0;
}

.hotspot-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
}

.hotspot-list__empty {
  padding: 2rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotspot-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.hotspot-list__item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  background-color: #FFFFFF;
  border: 1.5px solid var(--ns-hotspot-card-border, #E3EAF0);
  border-radius: var(--ns-radius-md, 12px);
  cursor: pointer;
  outline: none;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
  user-select: none;
}

.hotspot-list__item:hover {
  background-color: var(--ns-hotspot-list-hover, #F8FAFC);
  border-color: #CBD5E1;
}

.hotspot-list__item:focus-visible {
  border-color: var(--ns-hotspot-teal-primary, #0B7285);
  box-shadow: 0 0 0 3px rgba(11, 114, 133, 0.2);
}

.hotspot-list__item--selected {
  background-color: var(--ns-hotspot-list-selected, #EFF8FA) !important;
  border-color: var(--ns-hotspot-teal-primary, #0B7285) !important;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.16) !important;
}

.hotspot-list__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.hotspot-list__rank {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ns-hotspot-teal-primary, #0B7285);
  min-width: 1.75rem;
}

.hotspot-list__label {
  flex: 1;
  font-weight: 600;
  color: var(--ns-ink, #0E2233);
  overflow-wrap: anywhere;
}

.hotspot-list__badge {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background-color: var(--ns-hotspot-badge-bg, #D8F1F3);
  color: var(--ns-hotspot-badge-fg, #0B6A7C);
  border-radius: var(--ns-radius-pill, 999px);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.hotspot-list__count {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
}

.hotspot-list__count-unit {
  font-weight: 500;
  font-size: 0.75rem;
}

.hotspot-list__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 2px;
}

.hotspot-list__zone {
  display: inline-flex;
  align-items: center;
}

.hotspot-list__zone-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1D4ED8;
  background-color: #EFF6FF;
  border: 1px solid #DBEAFE;
  border-radius: var(--ns-radius-control, 10px);
}

.hotspot-list__category {
  display: inline-flex;
  align-items: center;
}

.hotspot-list__category-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ns-slate, #5B6B7A);
  background-color: var(--ns-surface-2, #F8FAFC);
  border: 1px solid var(--ns-line, #E3E8EE);
  border-radius: var(--ns-radius-control, 10px);
}

@media (max-width: 991.98px) {
  .hotspot-list-card {
    height: auto;
    max-height: 480px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hotspot-list__item {
    transition: none;
  }
}
</style>
