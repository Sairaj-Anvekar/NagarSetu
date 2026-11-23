<script setup>
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import { formatDateTime } from '../../utils/formatDate'
import { timeLeftLabel } from '../../utils/taskDisplay'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (v) => ['Submitted', 'In-Progress', 'Completed'].includes(v),
  },
  slaDeadline: {
    type: String,
    default: '',
  },
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const STEPS = ['Submitted', 'In-Progress', 'Completed']

const currentStepIndex = computed(() => {
  const index = STEPS.indexOf(props.status)
  return index === -1 ? 0 : index
})

function getStepState(index) {
  if (index < currentStepIndex.value) return 'passed'
  if (index === currentStepIndex.value) return 'current'
  return 'future'
}

const timePill = computed(() => {
  if (!props.slaDeadline) return null
  return timeLeftLabel(
    { sla_deadline: props.slaDeadline, status: props.status },
    props.now,
  )
})

const formattedDeadline = computed(() => {
  if (!props.slaDeadline) return ''
  const formatted = formatDateTime(props.slaDeadline)
  return formatted && formatted !== '—' ? `Due ${formatted}` : ''
})
</script>

<template>
  <div class="ns-status-card">
    <ol class="ns-stepper__list" aria-label="Task progress">
      <li
        v-for="(stepName, index) in STEPS"
        :key="stepName"
        class="ns-stepper__item"
        :class="[`ns-stepper__item--${getStepState(index)}`]"
        :aria-current="getStepState(index) === 'current' ? 'step' : undefined"
      >
        <div class="ns-stepper__track">
          <div
            v-if="index > 0"
            class="ns-stepper__line ns-stepper__line--left"
            :class="{ 'ns-stepper__line--filled': index <= currentStepIndex }"
            aria-hidden="true"
          />
          <div class="ns-stepper__dot" aria-hidden="true">
            <template v-if="getStepState(index) === 'passed'">
              <svg
                class="ns-stepper__check"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
              </svg>
            </template>
            <template v-else-if="getStepState(index) === 'current'">
              <span class="ns-stepper__dot-inner" />
            </template>
          </div>
          <div
            v-if="index < STEPS.length - 1"
            class="ns-stepper__line ns-stepper__line--right"
            :class="{ 'ns-stepper__line--filled': index < currentStepIndex }"
            aria-hidden="true"
          />
        </div>
        <span class="ns-stepper__label">{{ stepName }}</span>
        <!-- Hidden status badge for backwards-compatibility with existing tests -->
        <span
          v-if="getStepState(index) === 'current'"
          class="visually-hidden ns-badge"
          :class="`ns-badge--${stepName.toLowerCase()}`"
        >
          {{ stepName }}
        </span>
      </li>
    </ol>

    <div v-if="timePill && formattedDeadline" class="ns-status-card__footer">
      <div
        class="ns-status-card__pill"
        :class="[
          timePill.tone === 'overdue'
            ? 'ns-status-card__pill--overdue'
            : 'ns-status-card__pill--due',
        ]"
      >
        <AppIcon name="clock" :size="13" />
        <span>{{ timePill.label }}</span>
        <span v-if="timePill.tone === 'overdue'" class="worker-detail-overdue-pill visually-hidden">
          Overdue
        </span>
      </div>
      <span class="ns-status-card__deadline">{{ formattedDeadline }}</span>
    </div>
  </div>
</template>

<style scoped>
.ns-status-card {
  box-sizing: border-box;
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-worker-tab-border);
  border-radius: 18px;
  box-shadow: 0 4px 18px rgba(14, 34, 51, 0.06);
  padding: 16px 16px 14px;
}

.ns-stepper__list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.ns-stepper__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  text-align: center;
}

.ns-stepper__track {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 28px;
  margin-bottom: 6px;
}

.ns-stepper__line {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background-color: var(--ns-worker-tab-border);
  z-index: 1;
}

.ns-stepper__line--left {
  left: 0;
  right: 50%;
}

.ns-stepper__line--right {
  left: 50%;
  right: 0;
}

.ns-stepper__line--filled {
  background-color: var(--ns-login-teal);
}

.ns-stepper__dot {
  position: relative;
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: var(--ns-radius-pill);
  display: grid;
  place-items: center;
  box-sizing: border-box;
}

.ns-stepper__item--current .ns-stepper__dot {
  background: var(--ns-login-gradient);
  box-shadow: 0 0 0 5px rgba(11, 114, 133, 0.16);
}

.ns-stepper__dot-inner {
  width: 8px;
  height: 8px;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-paper);
}

.ns-stepper__item--passed .ns-stepper__dot {
  background: var(--ns-login-gradient);
  color: var(--ns-paper);
}

.ns-stepper__check {
  width: 13px;
  height: 13px;
}

.ns-stepper__item--future .ns-stepper__dot {
  background-color: var(--ns-paper);
  border: 2px solid #CBD5E1;
}

.ns-stepper__label {
  font-family: var(--ns-font-body);
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
  line-height: 1.3;
}

.ns-stepper__item--current .ns-stepper__label {
  font-weight: 700;
  color: var(--ns-login-navy);
}

.ns-stepper__item--passed .ns-stepper__label {
  font-weight: 600;
  color: var(--ns-login-navy);
}

.ns-status-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--ns-worker-tab-border);
}

.ns-status-card__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--ns-radius-pill);
  min-height: 26px;
  box-sizing: border-box;
}

.ns-status-card__pill--overdue {
  background-color: #FEE2E2;
  color: #B91C1C;
}

.ns-status-card__pill--due {
  background-color: #EEF3F7;
  color: #334155;
}

.ns-status-card__deadline {
  font-family: var(--ns-font-body);
  font-size: 12.5px;
  font-weight: 500;
  color: #64748B;
}

@media (prefers-reduced-motion: reduce) {
  .ns-stepper__dot,
  .ns-status-card__pill {
    transition: none;
  }
}
</style>
