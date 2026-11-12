<script setup>
import { computed, inject, ref, watch } from 'vue'
import { RouterLink, routerKey } from 'vue-router'
import AppIcon from '../AppIcon.vue'
import PriorityBadge from '../PriorityBadge.vue'
import StatusBadge from '../StatusBadge.vue'
import { formatDateTime, getDueInfo } from '../../utils/formatDate'
import { buildDirectionsUrl } from '../../utils/googleMaps'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const hasRouter = Boolean(inject(routerKey, null))
const imageError = ref(false)

watch(
  () => props.task?.image_url,
  () => {
    imageError.value = false
  },
)

const taskDetailPath = computed(() => `/worker/tasks/${encodeURIComponent(props.task?.id ?? '')}`)
const showThumbnail = computed(() => Boolean(props.task?.image_url) && !imageError.value)
const dueInfo = computed(() => getDueInfo(props.task?.sla_deadline))
const formattedDeadline = computed(() => formatDateTime(props.task?.sla_deadline))
const directionsUrl = computed(() =>
  buildDirectionsUrl(props.task?.latitude, props.task?.longitude),
)
</script>

<template>
  <article class="worker-task-card position-relative">
    <div class="worker-task-card__header d-flex align-items-center justify-content-between gap-2">
      <span class="worker-task-card__tracking">{{ task.tracking_code }}</span>
      <div class="d-flex align-items-center flex-wrap gap-2">
        <PriorityBadge :priority="task.priority" />
        <StatusBadge :status="task.status" />
      </div>
    </div>

    <div class="worker-task-card__main d-flex align-items-start gap-3">
      <div class="worker-task-card__thumb">
        <img
          v-if="showThumbnail"
          :src="task.image_url"
          :alt="`${task.category} complaint photo`"
          class="worker-task-card__thumb-img"
          @error="imageError = true"
        />
        <div v-else class="worker-task-card__thumb-placeholder" aria-hidden="true">No photo</div>
      </div>

      <div class="worker-task-card__body flex-grow-1">
        <h2 class="worker-task-card__category">
          <RouterLink
            v-if="hasRouter"
            :to="taskDetailPath"
            class="worker-task-card__link stretched-link"
            :aria-label="`Open task ${task.tracking_code}, ${task.category}`"
          >
            {{ task.category }}
          </RouterLink>
          <a
            v-else
            :href="taskDetailPath"
            class="worker-task-card__link stretched-link"
            :aria-label="`Open task ${task.tracking_code}, ${task.category}`"
          >
            {{ task.category }}
          </a>
        </h2>
        <p class="worker-task-card__description">{{ task.description }}</p>
      </div>

      <span class="worker-task-card__chevron align-self-center" aria-hidden="true">
        <AppIcon name="chevron-right" :size="20" />
      </span>
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

    <div v-if="directionsUrl" class="worker-task-card__actions pt-1">
      <a
        class="btn btn-outline-primary worker-task-card__directions-btn d-inline-flex align-items-center justify-content-center gap-2"
        :href="directionsUrl"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
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

.worker-task-card__main {
  min-width: 0;
}

.worker-task-card__thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--ns-radius-control);
  overflow: hidden;
  border: 1px solid var(--ns-line);
  background-color: var(--ns-neutral-bg);
}

.worker-task-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.worker-task-card__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 4px;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ns-neutral-fg);
  background-color: var(--ns-neutral-bg);
}

.worker-task-card__body {
  min-width: 0;
}

.worker-task-card__category {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-size: 1.0625rem;
  line-height: 1.4;
  margin: 0 0 4px;
  color: var(--ns-ink);
}

.worker-task-card__link {
  color: inherit;
  text-decoration: none;
}

.worker-task-card__link:focus-visible {
  outline: 2px solid var(--ns-span);
  outline-offset: 2px;
  border-radius: 4px;
}

.worker-task-card__chevron {
  color: var(--ns-slate);
  flex-shrink: 0;
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
  position: relative;
  z-index: 2;
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
