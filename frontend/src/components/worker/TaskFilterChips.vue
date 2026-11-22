<script setup>
import { computed } from 'vue'
import { countsByFilter } from '../../utils/taskDisplay'

const props = defineProps({
  /**
   * Active tasks array used to compute per-chip counts.
   */
  tasks: {
    type: Array,
    required: true,
  },
  /**
   * "now" reference for overdue calculations. Accepts a Date or ms timestamp.
   * Defaults to the real current time; pass a fixed value in tests.
   */
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
  /**
   * The currently active filter key. WorkerView owns this state and passes it
   * down; TaskFilterChips emits 'update:filter' when the selection changes.
   * Valid values: 'all' | 'Submitted' | 'In-Progress' | 'overdue'
   */
  filter: {
    type: String,
    default: 'all',
  },
})

const emit = defineEmits(['update:filter'])

const counts = computed(() => countsByFilter(props.tasks, props.now))

const chips = computed(() => [
  { key: 'all',          label: 'All',         count: counts.value.all },
  { key: 'Submitted',    label: 'Submitted',   count: counts.value.submitted },
  { key: 'In-Progress',  label: 'In-Progress', count: counts.value.inProgress },
  { key: 'overdue',      label: 'Overdue',     count: counts.value.overdue },
])

function selectFilter(key) {
  if (key !== props.filter) {
    emit('update:filter', key)
  }
}
</script>

<template>
  <div class="task-filter-chips" role="group" aria-label="Filter tasks">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="task-filter-chips__chip"
      :class="{ 'task-filter-chips__chip--active': chip.key === filter }"
      :aria-pressed="chip.key === filter"
      @click="selectFilter(chip.key)"
    >
      {{ chip.label }} · {{ chip.count }}
    </button>
  </div>
</template>

<style scoped>
.task-filter-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  /* Thin scrollbar on browsers that support it; hidden on WebKit (finger-scroll still works). */
  scrollbar-width: thin;
  scrollbar-color: var(--ns-gray-300) transparent;
  /* Small bottom padding so the scrollbar, when visible, does not clip the chip shadows. */
  padding-bottom: 4px;
}

.task-filter-chips::-webkit-scrollbar {
  height: 3px;
}

.task-filter-chips::-webkit-scrollbar-thumb {
  background-color: var(--ns-gray-300);
  border-radius: var(--ns-radius-pill);
}

.task-filter-chips__chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border-radius: var(--ns-radius-pill);
  border: 1px solid var(--ns-login-field-border);
  background: var(--ns-paper);
  color: var(--ns-task-label);
  font-family: var(--ns-font-body);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--ns-duration-fast) var(--ns-easing),
              color var(--ns-duration-fast) var(--ns-easing),
              border-color var(--ns-duration-fast) var(--ns-easing);
}

.task-filter-chips__chip:focus-visible {
  outline: 2px solid var(--ns-teal-600);
  outline-offset: 2px;
}

.task-filter-chips__chip--active {
  background: var(--ns-worker-tab-pill-bg);
  color: var(--ns-worker-tab-active);
  border-color: var(--ns-worker-tab-pill-bg);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .task-filter-chips__chip {
    transition: none;
  }
}
</style>
