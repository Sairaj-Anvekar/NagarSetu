<script setup>
import { computed } from 'vue'
import { countsByFilter } from '../../utils/taskDisplay'

const props = defineProps({
  /**
   * Active tasks array (Submitted + In-Progress).
   * Completed tasks passed in still won't be counted as overdue.
   */
  tasks: {
    type: Array,
    required: true,
  },
  /**
   * "now" reference used for overdue calculations. Accepts a Date object or
   * a millisecond timestamp. Defaults to the real current time.
   * Pass a fixed value in tests to make counts deterministic.
   */
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const counts = computed(() => countsByFilter(props.tasks, props.now))
</script>

<template>
  <div class="task-summary-strip" role="region" aria-label="Task counts">
    <div class="task-summary-strip__card" data-testid="strip-submitted">
      <span class="task-summary-strip__number">{{ counts.submitted }}</span>
      <span class="task-summary-strip__label">Submitted</span>
    </div>
    <div class="task-summary-strip__card" data-testid="strip-in-progress">
      <span class="task-summary-strip__number">{{ counts.inProgress }}</span>
      <span class="task-summary-strip__label">In-Progress</span>
    </div>
    <div class="task-summary-strip__card" data-testid="strip-overdue">
      <span
        class="task-summary-strip__number"
        :class="{ 'task-summary-strip__number--overdue': counts.overdue > 0 }"
      >{{ counts.overdue }}</span>
      <span class="task-summary-strip__label">Overdue</span>
    </div>
  </div>
</template>

<style scoped>
.task-summary-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  /* Sits above the header background when WorkerView applies a negative margin-top. */
  position: relative;
  z-index: 1;
}

.task-summary-strip__card {
  background: var(--ns-paper);
  border: 1px solid var(--ns-worker-tab-border);
  border-radius: var(--ns-radius-lg);
  box-shadow: 0 8px 22px rgba(14, 34, 51, 0.10);
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.task-summary-strip__number {
  font-family: var(--ns-font-display);
  font-weight: 700;
  font-size: 24px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--ns-ink);
}

.task-summary-strip__number--overdue {
  color: var(--ns-overdue-fg);
}

.task-summary-strip__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--ns-slate);
  text-align: center;
  white-space: nowrap;
}
</style>
