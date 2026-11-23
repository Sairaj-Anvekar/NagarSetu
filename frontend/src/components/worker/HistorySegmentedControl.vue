<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'week',
    validator: (value) => ['week', 'month'].includes(value),
  },
  weekCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:modelValue'])

function select(period) {
  emit('update:modelValue', period)
}
</script>

<template>
  <div
    class="ns-history-segmented"
    role="tablist"
    aria-label="History period"
  >
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'week'"
      :class="[
        'ns-history-segmented__btn',
        { 'ns-history-segmented__btn--active': modelValue === 'week' },
      ]"
      @click="select('week')"
    >
      This week · {{ weekCount }}
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'month'"
      :class="[
        'ns-history-segmented__btn',
        { 'ns-history-segmented__btn--active': modelValue === 'month' },
      ]"
      @click="select('month')"
    >
      This month
    </button>
  </div>
</template>

<style scoped>
.ns-history-segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  background-color: var(--ns-paper, #ffffff);
  border: 1px solid var(--ns-worker-tab-border, #e3eaf0);
  border-radius: 16px;
  padding: 4px;
  box-shadow: 0 8px 22px rgba(14, 34, 51, 0.1);
  box-sizing: border-box;
  width: 100%;
}

.ns-history-segmented__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ns-login-control-text, #0b5c70);
  font-family: var(--ns-font-display);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background var(--ns-duration-fast, 140ms) ease,
    color var(--ns-duration-fast, 140ms) ease,
    box-shadow var(--ns-duration-fast, 140ms) ease;
}

.ns-history-segmented__btn--active {
  background: var(--ns-login-gradient, linear-gradient(135deg, #0b7285, #0e4f6b));
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(11, 114, 133, 0.25);
}

.ns-history-segmented__btn:focus-visible {
  outline: 2px solid var(--ns-span, #14a89a);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .ns-history-segmented__btn {
    transition: none;
  }
}
</style>
