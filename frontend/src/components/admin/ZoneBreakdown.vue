<script setup>
import { computed } from 'vue'

const props = defineProps({
  zones: {
    type: Array,
    default: () => [],
  },
})

const maxCount = computed(() => {
  if (!props.zones || props.zones.length === 0) return 0
  return Math.max(
    ...props.zones.map((item) => (typeof item?.count === 'number' ? item.count : 0)),
    0,
  )
})

function getBarWidth(count) {
  if (maxCount.value <= 0 || !count) return '0%'
  const pct = (count / maxCount.value) * 100
  return `${pct}%`
}
</script>

<template>
  <div class="zone-breakdown">
    <div v-if="!zones || zones.length === 0" class="zone-breakdown__empty text-muted">
      No data
    </div>
    <div v-else class="zone-breakdown__list" role="list">
      <div v-for="item in zones" :key="item.zone" class="zone-breakdown__item" role="listitem">
        <div class="zone-breakdown__header">
          <span class="zone-breakdown__name">{{ item.zone }}</span>
          <span class="zone-breakdown__count ns-num">{{ item.count }}</span>
        </div>
        <div class="zone-breakdown__track">
          <div
            class="zone-breakdown__bar"
            :style="{ width: getBarWidth(item.count) }"
            :aria-valuenow="item.count"
            :aria-valuemax="maxCount"
            aria-valuemin="0"
            role="progressbar"
            :aria-label="`${item.zone}: ${item.count}`"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zone-breakdown {
  width: 100%;
}

.zone-breakdown__empty {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ns-slate);
}

.zone-breakdown__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.zone-breakdown__item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.zone-breakdown__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.zone-breakdown__name {
  color: var(--ns-ink);
  font-weight: 500;
}

.zone-breakdown__count {
  color: var(--ns-ink);
  font-weight: 600;
}

.zone-breakdown__track {
  width: 100%;
  height: 8px;
  background-color: var(--ns-neutral-bg);
  border-radius: var(--ns-radius-pill);
  overflow: hidden;
}

.zone-breakdown__bar {
  height: 100%;
  background-color: var(--ns-harbour);
  border-radius: var(--ns-radius-pill);
}
</style>

