<script setup>
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import PriorityBadge from '../PriorityBadge.vue'
import StatusBadge from '../StatusBadge.vue'
import { formatDateTime, getDueInfo } from '../../utils/formatDate'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const dueInfo = computed(() => getDueInfo(props.task?.sla_deadline))
const formattedDeadline = computed(() => formatDateTime(props.task?.sla_deadline))

const hasValidCoords = computed(() => {
  const lat = props.task?.latitude
  const lng = props.task?.longitude
  return (
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
  )
})

const directionsUrl = computed(() => {
  if (!hasValidCoords.value) return ''
  const lat = props.task.latitude
  const lng = props.task.longitude
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`
})
</script>

<template>
  <article class="worker-task-card">
    <div class="worker-task-card__header d-flex align-items-center justify-content-between gap-2">
      <span class="worker-task-card__tracking">{{ task.tracking_code }}</span>
      <div class="d-flex align-items-center flex-wrap gap-2">
        <PriorityBadge :priority="task.priority" />
        <StatusBadge :status="task.status" />
      </div>
    </div>

    <div class="worker-task-card__body">
      <h2 class="worker-task-card__category">{{ task.category }}</h2>
      <p class="worker-task-card__description">{{ task.description }}</p>
    </div>

    <div class="worker-task-card__deadline d-flex align-items-center flex-wrap gap-2">
      <AppIcon name="clock" :size="18" />
      <span
        class="worker-task-card__relative"
        :class="{ 'worker-task-card__relative--overdue': task.is_overdue }"
      >
        {{ dueInfo.text }}
      </span>
      <span v-if="task.is_overdue" class="worker-task-card__overdue-pill"> Overdue </span>
      <span class="worker-task-card__deadline-time">
        {{ formattedDeadline }}
      </span>
    </div>

    <div v-if="hasValidCoords" class="worker-task-card__actions pt-1">
      <a
        class="btn btn-outline-primary worker-task-card__directions-btn d-inline-flex align-items-center justify-content-center gap-2"
        :href="directionsUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <AppIcon name="map-pin" :size="18" />
        <span>Get directions</span>
      </a>
    </div>
  </article>
</template>

<style scoped>
.worker-task-card {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.worker-task-card__tracking {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ns-ink);
}

.worker-task-card__category {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-size: 1.0625rem;
  line-height: 1.4;
  margin: 0 0 4px;
  color: var(--ns-ink);
}

.worker-task-card__description {
  color: var(--ns-slate);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.worker-task-card__deadline {
  font-size: 0.875rem;
  color: var(--ns-ink);
}

.worker-task-card__relative {
  font-weight: 500;
}

.worker-task-card__relative--overdue {
  color: var(--ns-danger-fg);
  font-weight: 600;
}

.worker-task-card__overdue-pill {
  background-color: var(--ns-danger-bg);
  color: var(--ns-danger-fg);
  border-radius: var(--ns-radius-pill);
  font-weight: 600;
  font-size: 0.75rem;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
}

.worker-task-card__deadline-time {
  font-size: 0.8125rem;
  color: var(--ns-slate);
}

.worker-task-card__directions-btn {
  width: 100%;
  min-height: 44px;
  font-weight: 500;
}

@media (min-width: 576px) {
  .worker-task-card__directions-btn {
    width: auto;
  }
}
</style>
