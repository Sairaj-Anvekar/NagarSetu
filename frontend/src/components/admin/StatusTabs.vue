<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  counts: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const TABS = [
  { value: '', label: 'All', countKeys: ['all', 'total'] },
  { value: 'Submitted', label: 'Submitted', countKeys: ['submitted'] },
  { value: 'In-Progress', label: 'In-Progress', countKeys: ['inProgress', 'in_progress'] },
  { value: 'Completed', label: 'Completed', countKeys: ['completed'] },
]

function getCount(tab) {
  if (!props.counts || typeof props.counts !== 'object') return null
  for (const key of tab.countKeys) {
    const val = props.counts[key]
    if (typeof val === 'number' && !Number.isNaN(val)) {
      return val
    }
  }
  return null
}

const tabsWithCounts = computed(() => {
  return TABS.map((tab) => ({
    ...tab,
    count: getCount(tab),
  }))
})

function selectTab(value) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="status-tabs" role="tablist" aria-label="Filter complaints by status">
    <button
      v-for="tab in tabsWithCounts"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      class="status-tab"
      :class="{ 'status-tab--active': modelValue === tab.value }"
      @click="selectTab(tab.value)"
    >
      <span class="status-tab__label">{{ tab.label }}</span>
      <span
        v-if="tab.count !== null"
        class="status-tab__count"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.status-tabs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.status-tab {
  height: 40px;
  min-height: 40px;
  min-width: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
}

.status-tab:hover:not(.status-tab--active) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
}

.status-tab:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.status-tab--active {
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(11, 114, 133, 0.2);
}

.status-tab__label {
  line-height: 1;
}

.status-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 7px;
  border-radius: 999px;
  background-color: #EEF3F7;
  color: #475569;
}

.status-tab--active .status-tab__count {
  background-color: rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
}

@media (prefers-reduced-motion: reduce) {
  .status-tab {
    transition: none;
  }
}
</style>
