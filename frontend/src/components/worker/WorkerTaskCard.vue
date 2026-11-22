<script setup>
import { computed, inject } from 'vue'
import { RouterLink, routerKey } from 'vue-router'
import AppIcon from '../AppIcon.vue'
import PriorityBadge from '../PriorityBadge.vue'
import StatusBadge from '../StatusBadge.vue'
import { isOverdue, timeLeftLabel } from '../../utils/taskDisplay'
import { buildDirectionsUrl } from '../../utils/googleMaps'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  zone: {
    type: String,
    default: '',
  },
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const hasRouter = Boolean(inject(routerKey, null))

const taskDetailPath = computed(() =>
  `/worker/tasks/${encodeURIComponent(props.task?.id ?? '')}`,
)

const taskZone = computed(() => props.zone || props.task?.zone || '')
const timeInfo = computed(() => timeLeftLabel(props.task, props.now))
const showOverdueFallback = computed(() => !timeInfo.value && isOverdue(props.task, props.now))

const directionsUrl = computed(() =>
  buildDirectionsUrl(props.task?.latitude, props.task?.longitude),
)
</script>

<template>
  <article class="worker-task-card position-relative">
    <div class="worker-task-card__inner">
      <!-- 44px priority-tinted category icon -->
      <span
        class="worker-task-card__icon"
        :class="`worker-task-card__icon--${task.priority}`"
        aria-hidden="true"
      >
        <AppIcon name="tasks" :size="22" />
      </span>

      <!-- Tracking code + category name -->
      <div class="worker-task-card__body">
        <span class="worker-task-card__tracking">{{ task.tracking_code }}</span>
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
      </div>
    </div>

    <!-- Pills row -->
    <div class="worker-task-card__pills d-flex align-items-center flex-wrap gap-2">
      <PriorityBadge :priority="task.priority" />
      <StatusBadge :status="task.status" />
      <span
        v-if="timeInfo"
        class="worker-task-card__time-pill"
        :class="{
          'worker-task-card__overdue-pill': timeInfo.tone === 'overdue',
          'worker-task-card__time-pill--due': timeInfo.tone === 'due',
        }"
      >
        {{ timeInfo.label }}
      </span>
      <span
        v-else-if="showOverdueFallback"
        class="worker-task-card__time-pill worker-task-card__overdue-pill"
      >
        Overdue
      </span>
      <span v-if="taskZone" class="worker-task-card__zone-chip">
        {{ taskZone }}
      </span>
    </div>

    <!-- Actions row -->
    <div class="worker-task-card__actions d-flex align-items-center gap-2 pt-1">
      <a
        v-if="directionsUrl"
        class="btn btn-outline-primary worker-task-card__directions-btn d-inline-flex align-items-center justify-content-center gap-2"
        :href="directionsUrl"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        <AppIcon name="map-pin" :size="18" />
        <span>Directions</span>
      </a>
      <span class="worker-task-card__open-btn" aria-hidden="true">
        Open task
      </span>
    </div>
  </article>
</template>

<style scoped>
/* ── Card shell ─────────────────────────────────────────────────────────── */
.worker-task-card {
  background: var(--ns-paper);
  border: 1px solid var(--ns-worker-tab-border);
  border-radius: 18px;
  padding: 16px;
  box-shadow:
    0 1px 2px rgba(14, 34, 51, 0.05),
    0 10px 24px rgba(14, 34, 51, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (hover: hover) {
  .worker-task-card:hover {
    box-shadow:
      0 1px 2px rgba(14, 34, 51, 0.08),
      0 12px 28px rgba(14, 34, 51, 0.10);
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .worker-task-card {
    transition: box-shadow var(--ns-duration-fast) var(--ns-easing);
  }
}

/* ── Inner row (icon + body) ─────────────────────────────────────────────── */
.worker-task-card__inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* ── Priority-tinted icon ────────────────────────────────────────────────── */
.worker-task-card__icon {
  --icon-tint-bg: #E0EEFF;
  --icon-tint-fg: #1D4ED8;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: var(--icon-tint-bg);
  color: var(--icon-tint-fg);
  display: grid;
  place-items: center;
}

.worker-task-card__icon--critical,
.worker-task-card__icon--high {
  --icon-tint-bg: #FFEDD5;
  --icon-tint-fg: #9A3412;
}

.worker-task-card__icon--medium {
  --icon-tint-bg: #FEF3C7;
  --icon-tint-fg: #92400E;
}

.worker-task-card__icon--low {
  --icon-tint-bg: #E0EEFF;
  --icon-tint-fg: #1D4ED8;
}

/* ── Body (tracking code + category) ────────────────────────────────────── */
.worker-task-card__body {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.worker-task-card__tracking {
  font-family: var(--ns-font-display);
  font-weight: 700;
  font-size: 15px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  color: var(--ns-ink);
}

.worker-task-card__category {
  margin: 0;
  font-family: var(--ns-font-body);
  font-weight: 500;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--ns-slate);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worker-task-card__link {
  color: inherit;
  text-decoration: none;
}

.worker-task-card__link:focus-visible {
  outline: 2px solid var(--ns-teal-600);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Pills row ───────────────────────────────────────────────────────────── */
.worker-task-card__pills {
  min-width: 0;
}

.worker-task-card__time-pill {
  display: inline-flex;
  align-items: center;
  border-radius: var(--ns-radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  line-height: 1.25;
  white-space: nowrap;
}

.worker-task-card__overdue-pill {
  background-color: #FEE2E2;
  color: var(--ns-overdue-fg);
}

.worker-task-card__time-pill--due {
  background-color: var(--ns-login-switch-bg);
  color: var(--ns-task-label);
}

.worker-task-card__zone-chip {
  display: inline-flex;
  align-items: center;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-neutral-bg);
  color: var(--ns-task-label);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  line-height: 1.25;
  white-space: nowrap;
}

/* ── Actions row ─────────────────────────────────────────────────────────── */
.worker-task-card__actions {
  min-width: 0;
}

.worker-task-card__directions-btn {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-height: 44px;
  font-weight: 600;
  font-size: 0.875rem;
}

.worker-task-card__open-btn {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--ns-radius-control);
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: var(--ns-paper);
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  user-select: none;
}
</style>
