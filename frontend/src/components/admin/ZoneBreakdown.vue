<script setup>
import { computed } from 'vue'
import { labelOf } from '../../utils/labelOf'

const props = defineProps({
  zones: {
    type: Array,
    default: () => [],
  },
  showLegend: {
    type: Boolean,
    default: true,
  },
})

const maxCount = computed(() => {
  if (!props.zones || props.zones.length === 0) return 0
  return Math.max(
    ...props.zones.map((item) => (typeof item?.count === 'number' ? item.count : 0)),
    0,
  )
})

const totalCount = computed(() =>
  (props.zones || []).reduce((total, item) => total + (Number(item.count) || 0), 0),
)

function getPercentage(count) {
  return totalCount.value > 0 ? Math.round((count / totalCount.value) * 100) : 0
}

function getBarWidth(count) {
  if (maxCount.value <= 0 || !count) return '0%'
  const pct = (count / maxCount.value) * 100
  return `${pct}%`
}

function hasStatusBreakdown(item) {
  return (
    typeof item?.submitted === 'number' ||
    typeof item?.in_progress === 'number' ||
    typeof item?.completed === 'number'
  )
}

function getSegmentWidth(segmentCount, rowTotal) {
  if (!rowTotal || rowTotal <= 0 || !segmentCount) return '0%'
  return `${Math.min(100, (segmentCount / rowTotal) * 100)}%`
}
</script>

<template>
  <div class="zone-breakdown">
    <div
      v-if="showLegend && zones && zones.length > 0"
      class="zone-breakdown__legend"
      aria-hidden="true"
    >
      <div class="zone-breakdown__legend-item">
        <span class="zone-breakdown__dot zone-breakdown__dot--submitted"></span>
        <span>Submitted</span>
      </div>
      <div class="zone-breakdown__legend-item">
        <span class="zone-breakdown__dot zone-breakdown__dot--in-progress"></span>
        <span>In-Progress</span>
      </div>
      <div class="zone-breakdown__legend-item">
        <span class="zone-breakdown__dot zone-breakdown__dot--completed"></span>
        <span>Completed</span>
      </div>
    </div>

    <div v-if="!zones || zones.length === 0" class="zone-breakdown__empty text-muted">
      No data
    </div>

    <div v-else class="zone-breakdown__list" role="list">
      <div v-for="item in zones" :key="labelOf(item.zone) || item.zone" class="zone-breakdown__item" role="listitem">
        <div class="zone-breakdown__header">
          <span class="zone-breakdown__chip" aria-hidden="true">
            {{ labelOf(item.zone).replace(/^Zone\s+/i, '').charAt(0) }}
          </span>
          <span class="zone-breakdown__name">{{ labelOf(item.zone) }}</span>
          <span class="zone-breakdown__percentage ns-num">
            {{ getPercentage(item.count) }}%
          </span>
          <span class="zone-breakdown__count ns-num">{{ item.count }}</span>
        </div>

        <div class="zone-breakdown__track">
          <div
            class="zone-breakdown__bar"
            :class="{ 'zone-breakdown__bar--stacked': hasStatusBreakdown(item) }"
            :style="{ width: getBarWidth(item.count) }"
            :aria-valuenow="item.count"
            :aria-valuemax="maxCount"
            aria-valuemin="0"
            role="progressbar"
            :aria-label="`${labelOf(item.zone)}: ${item.count}`"
          >
            <template v-if="hasStatusBreakdown(item)">
              <span
                v-if="item.submitted"
                class="zone-breakdown__segment zone-breakdown__segment--submitted"
                :style="{ width: getSegmentWidth(item.submitted, item.count) }"
              />
              <span
                v-if="item.in_progress"
                class="zone-breakdown__segment zone-breakdown__segment--in-progress"
                :style="{ width: getSegmentWidth(item.in_progress, item.count) }"
              />
              <span
                v-if="item.completed"
                class="zone-breakdown__segment zone-breakdown__segment--completed"
                :style="{ width: getSegmentWidth(item.completed, item.count) }"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zone-breakdown {
  width: 100%;
}

.zone-breakdown__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 12px;
  color: #4B5B6B;
}

.zone-breakdown__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.zone-breakdown__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zone-breakdown__dot--submitted {
  background-color: #3B82F6;
}

.zone-breakdown__dot--in-progress {
  background-color: #F59E0B;
}

.zone-breakdown__dot--completed {
  background-color: #22C55E;
}

.zone-breakdown__empty {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: #5F6F7E;
}

.zone-breakdown__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.zone-breakdown__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.zone-breakdown__header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.zone-breakdown__chip {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: #E6F4F6;
  color: #0B6A7C;
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
  font-size: 12px;
}

.zone-breakdown__name {
  flex: 1;
  min-width: 0;
  color: #0E2233;
  font-weight: 600;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.zone-breakdown__percentage {
  color: #5F6F7E;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.zone-breakdown__count {
  min-width: 28px;
  text-align: right;
  color: #0E2233;
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-weight: 700;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.zone-breakdown__track {
  width: 100%;
  height: 8px;
  background-color: #EEF3F7;
  border-radius: 999px;
  overflow: hidden;
}

.zone-breakdown__bar {
  display: flex;
  height: 100%;
  background-color: #0B7285;
  border-radius: 999px;
  overflow: hidden;
}

.zone-breakdown__bar--stacked {
  background-color: transparent;
}

.zone-breakdown__segment {
  height: 100%;
}

.zone-breakdown__segment--submitted {
  background-color: #3B82F6;
}

.zone-breakdown__segment--in-progress {
  background-color: #F59E0B;
}

.zone-breakdown__segment--completed {
  background-color: #22C55E;
}

@media (prefers-reduced-motion: no-preference) {
  .zone-breakdown__bar {
    transition: width var(--ns-duration-fast, 120ms) ease;
  }
}
</style>
