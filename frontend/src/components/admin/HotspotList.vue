<script setup>
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps({
  hotspots: {
    type: Array,
    default: () => [],
  },
})

const sortedHotspots = computed(() => {
  if (!Array.isArray(props.hotspots)) {
    return []
  }
  return [...props.hotspots].sort((a, b) => (b.count || 0) - (a.count || 0))
})
</script>

<template>
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
      >
        <div class="hotspot-list__item-header">
          <span class="hotspot-list__rank">#{{ index + 1 }}</span>
          <span class="hotspot-list__label">{{ hotspot.label || `Hotspot #${index + 1}` }}</span>
          <span class="hotspot-list__badge">
            <span class="hotspot-list__count">{{ hotspot.count }}</span>
            <span class="hotspot-list__count-unit">
              {{ hotspot.count === 1 ? 'complaint' : 'complaints' }}
            </span>
          </span>
        </div>

        <div v-if="hotspot.category" class="hotspot-list__category">
          <span class="hotspot-list__category-tag">{{ hotspot.category }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hotspot-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.hotspot-list__empty {
  padding: 1rem 0;
}

.hotspot-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hotspot-list__item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
}

.hotspot-list__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.hotspot-list__rank {
  font-family: var(--ns-font-display);
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ns-slate);
  min-width: 1.5rem;
}

.hotspot-list__label {
  flex: 1;
  font-weight: 600;
  color: var(--ns-ink);
  overflow-wrap: anywhere;
}

.hotspot-list__badge {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background-color: var(--ns-orange-bg);
  color: var(--ns-orange-fg);
  border-radius: var(--ns-radius-pill);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.hotspot-list__count {
  font-family: var(--ns-font-display);
  font-weight: 700;
}

.hotspot-list__count-unit {
  font-weight: 500;
  font-size: 0.75rem;
}

.hotspot-list__category {
  display: flex;
  align-items: center;
}

.hotspot-list__category-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ns-neutral-fg);
  background-color: var(--ns-neutral-bg);
  border-radius: var(--ns-radius-control);
}
</style>
