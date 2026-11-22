<script setup>
import { computed, inject } from 'vue'
import { RouterLink, routerKey } from 'vue-router'
import AppIcon from '../AppIcon.vue'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const hasRouter = Boolean(inject(routerKey, null))

const taskDetailPath = computed(() =>
  `/worker/tasks/${encodeURIComponent(props.task?.id ?? '')}`,
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
/*
 * Default tint colours (Low). Priority-specific modifier classes override
 * the custom properties on the same element so the icon picks them up.
 * Critical shares High's palette per the design spec.
 */
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
</style>
