<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'pending',
  },
  pendingCount: {
    type: Number,
    default: null,
  },
  reviewedCount: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

function selectTab(tab) {
  emit('update:modelValue', tab)
}
</script>

<template>
  <div class="ns-triage-tabs" role="tablist" aria-label="Triage status tabs">
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'pending'"
      class="ns-triage-tab"
      :class="{ 'ns-triage-tab--active': modelValue === 'pending' }"
      data-test="tab-pending"
      @click="selectTab('pending')"
    >
      <span class="ns-triage-tab__label">Pending</span>
      <span v-if="pendingCount !== null" class="ns-triage-tab__count" data-test="pending-count">
        {{ pendingCount }}
      </span>
    </button>

    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'reviewed'"
      class="ns-triage-tab"
      :class="{ 'ns-triage-tab--active': modelValue === 'reviewed' }"
      data-test="tab-reviewed"
      @click="selectTab('reviewed')"
    >
      <span class="ns-triage-tab__label">Reviewed</span>
      <span v-if="reviewedCount !== null" class="ns-triage-tab__count" data-test="reviewed-count">
        {{ reviewedCount }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.ns-triage-tabs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ns-space-8, 8px);
}

.ns-triage-tab {
  height: 40px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 var(--ns-space-16, 16px);
  border-radius: var(--ns-radius-pill, 999px);
  border: 1.5px solid var(--ns-line, #D5DEE7);
  background-color: var(--ns-paper, #FFFFFF);
  color: var(--ns-ink, #334155);
  font-size: 0.8125rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ns-space-8, 8px);
  cursor: pointer;
  user-select: none;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-triage-tab:hover:not(.ns-triage-tab--active) {
  background-color: var(--ns-surface-2, #F8FAFC);
  border-color: #CBD5E1;
}

.ns-triage-tab:focus-visible {
  outline: 2px solid var(--ns-teal-600, #0B7285) !important;
  outline-offset: var(--ns-focus-ring-offset, 2px);
}

.ns-triage-tab--active {
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(11, 114, 133, 0.2);
}

.ns-triage-tab__label {
  line-height: 1;
}

.ns-triage-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 7px;
  border-radius: var(--ns-radius-pill, 999px);
  background-color: #EEF3F7;
  color: #475569;
}

.ns-triage-tab--active .ns-triage-tab__count {
  background-color: rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
}

@media (prefers-reduced-motion: reduce) {
  .ns-triage-tab {
    transition: none;
  }
}
</style>
