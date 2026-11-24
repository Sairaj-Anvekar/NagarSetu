<script setup>
import { computed } from 'vue'
import { getTimelineSteps } from '../../utils/complaintTimeline'
import { formatDateTime } from '../../utils/formatDate'

const props = defineProps({
  complaint: {
    type: Object,
    required: true,
  },
})

const timelineSteps = computed(() => {
  return getTimelineSteps(props.complaint)
})

const logs = computed(() => {
  return Array.isArray(props.complaint?.logs) ? props.complaint.logs : []
})

function formatEventType(type) {
  if (!type || typeof type !== 'string') return 'Update'
  const mapping = {
    created: 'Submitted',
    assigned: 'Assigned',
    started: 'Work started',
    deferred: 'Deferred',
    resolved: 'Completed',
  }
  return mapping[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1)
}

function formatActor(actor) {
  if (!actor || typeof actor !== 'string') return ''
  const mapping = {
    citizen: 'Citizen',
    worker: 'Worker',
    admin: 'Administrator',
    system: 'System',
  }
  return mapping[actor.toLowerCase()] || actor.charAt(0).toUpperCase() + actor.slice(1)
}

function getStepStateLabel(state) {
  switch (state) {
    case 'done':
      return 'Done'
    case 'current':
      return 'In progress'
    case 'future':
    default:
      return 'Pending'
  }
}
</script>

<template>
  <div class="ns-timeline-card mb-4">
    <div class="ns-timeline-card__header">
      <h2 class="ns-timeline-card__title">Status timeline</h2>
    </div>

    <div class="ns-timeline-card__body">
      <!-- 3-Step Vertical Stepper -->
      <ol class="ns-vertical-stepper" aria-label="Complaint status progression">
        <li
          v-for="(step, idx) in timelineSteps"
          :key="step.name"
          class="ns-stepper-step"
          :class="`ns-stepper-step--${step.state}`"
          :aria-current="step.state === 'current' ? 'step' : undefined"
        >
          <div class="ns-stepper-visual">
            <div
              class="ns-stepper-dot"
              :class="`ns-stepper-dot--${step.state}`"
              aria-hidden="true"
            >
              <!-- Done Step: Teal Dot with Tick -->
              <svg
                v-if="step.state === 'done'"
                class="ns-check-icon"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
              </svg>

              <!-- Current Step: Amber Ring Center Dot -->
              <span v-else-if="step.state === 'current'" class="ns-current-indicator" />
            </div>

            <!-- Connecting Track Line -->
            <div
              v-if="idx < timelineSteps.length - 1"
              class="ns-stepper-line"
              :class="{ 'ns-stepper-line--filled': step.state === 'done' }"
              aria-hidden="true"
            />
          </div>

          <div class="ns-stepper-content">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span class="ns-step-name fw-semibold">{{ step.name }}</span>
              <span
                class="ns-step-state-badge"
                :class="`ns-step-state-badge--${step.state}`"
              >
                {{ getStepStateLabel(step.state) }}
              </span>
            </div>
            <time v-if="step.formattedTime" class="ns-step-time text-secondary small d-block mt-1">
              {{ step.formattedTime }}
            </time>
          </div>
        </li>
      </ol>

      <!-- Preserved Chronological Status History Section (User Amendment 3) -->
      <div v-if="logs.length > 0" class="ns-status-history-section pt-3 mt-3 border-top">
        <h3 class="ns-history-title text-secondary small fw-bold mb-2">Status history</h3>
        <ol class="list-group list-group-flush mb-0 timeline-list">
          <li
            v-for="(log, idx) in logs"
            :key="idx"
            class="list-group-item px-0 py-2 d-flex flex-wrap justify-content-between align-items-center gap-2"
          >
            <div>
              <span class="fw-semibold">{{ formatEventType(log.event_type) }}</span>
              <span v-if="formatActor(log.actor_type)" class="text-secondary small ms-2">
                by {{ formatActor(log.actor_type) }}
              </span>
            </div>
            <time class="text-secondary small">{{ formatDateTime(log.created_at) }}</time>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-timeline-card {
  background-color: var(--ns-complaint-card-bg, #FFFFFF);
  border: 1px solid var(--ns-complaint-card-border, #E3EAF0);
  border-radius: var(--ns-complaint-card-radius, 18px);
  box-shadow: var(--ns-complaint-card-shadow, 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06));
  overflow: hidden;
}

.ns-timeline-card__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #EEF3F7;
}

.ns-timeline-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: #0E2233;
  margin: 0;
  line-height: 1.2;
}

.ns-timeline-card__body {
  padding: 20px 24px;
}

.ns-vertical-stepper {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.ns-stepper-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  min-height: 58px;
}

.ns-stepper-step:last-child {
  min-height: auto;
}

.ns-stepper-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 28px;
  flex-shrink: 0;
}

.ns-stepper-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  transition: all 150ms ease;
}

/* Done: Teal Gradient with Tick */
.ns-stepper-dot--done {
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
}

.ns-check-icon {
  width: 15px;
  height: 15px;
}

/* Current: Amber Ring with Inner Dot */
.ns-stepper-dot--current {
  background-color: #FEF3C7;
  border: 3px solid #D97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
}

.ns-current-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #D97706;
}

/* Future: Grey Outline */
.ns-stepper-dot--future {
  background-color: #FFFFFF;
  border: 2px solid #CBD5E1;
}

.ns-stepper-line {
  width: 2px;
  flex-grow: 1;
  background-color: #E2E8F0;
  min-height: 32px;
  margin: 4px 0;
}

.ns-stepper-line--filled {
  background-color: #0B7285;
}

.ns-stepper-content {
  flex: 1;
  padding-bottom: 14px;
}

.ns-step-name {
  font-size: 14px;
  color: #0E2233;
}

.ns-step-state-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1;
}

.ns-step-state-badge--done {
  background-color: #DCFCE7;
  color: #166534;
}

.ns-step-state-badge--current {
  background-color: #FEF3C7;
  color: #92400E;
}

.ns-step-state-badge--future {
  background-color: #F1F5F9;
  color: #64748B;
}

.ns-step-time {
  font-size: 12px;
  color: #64748B;
}

/* Status History Section */
.ns-status-history-section {
  border-color: #EEF3F7 !important;
}

.ns-history-title {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.timeline-list {
  padding-left: 0;
}

.timeline-list .list-group-item {
  background: transparent;
  border-color: #F1F5F9;
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .ns-stepper-dot {
    transition: none;
  }
}
</style>
