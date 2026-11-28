<script setup>
import { computed } from 'vue'
import { getInitials } from '../../utils/initials'
import { getWorkerDeadlinePill } from '../../utils/complaintTimeline'
import { labelOf } from '../../utils/labelOf'

const props = defineProps({
  complaint: {
    type: Object,
    required: true,
  },
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const worker = computed(() => {
  return props.complaint?.assigned_worker || null
})

const workerName = computed(() => {
  const name = worker.value?.name
  if (typeof name === 'string' && name.trim().toLowerCase() !== 'unassigned') {
    return name.trim()
  }
  return ''
})

const initials = computed(() => {
  return workerName.value ? getInitials(workerName.value) : ''
})

const deadlinePill = computed(() => {
  return getWorkerDeadlinePill(props.complaint, props.now)
})

const deferredCountText = computed(() => {
  const count = props.complaint?.carry_forward_count
  if (typeof count === 'number' && count > 0) {
    return `Deferred ${count} ${count === 1 ? 'time' : 'times'}`
  }
  return ''
})
</script>

<template>
  <div class="ns-assigned-worker-card mb-4">
    <div class="ns-assigned-worker-card__header">
      <h2 class="ns-assigned-worker-card__title">Assignment</h2>
    </div>

    <div class="ns-assigned-worker-card__body">
      <!-- Assigned Worker State -->
      <div v-if="workerName" class="ns-worker-profile">
        <div class="d-flex align-items-center gap-3">
          <div class="ns-worker-avatar" aria-hidden="true">
            {{ initials }}
          </div>
          <div class="ns-worker-info">
            <span class="ns-worker-name fw-semibold d-block">{{ workerName }}</span>
            <div class="d-flex align-items-center flex-wrap gap-2 mt-1">
              <span v-if="labelOf(worker.zone)" class="text-secondary small">{{ labelOf(worker.zone) }}</span>
              <span
                v-if="typeof worker.is_active === 'boolean'"
                class="worker-status-pill"
                :class="worker.is_active ? 'worker-status-pill--active' : 'worker-status-pill--inactive'"
              >
                <span class="worker-status-pill__dot" aria-hidden="true" />
                <span>{{ worker.is_active ? 'Active' : 'Inactive' }}</span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="deadlinePill" class="ns-worker-deadline-row mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
          <span class="text-secondary small">Task deadline</span>
          <span class="deadline-pill" :class="deadlinePill.className">
            {{ deadlinePill.label }}
          </span>
        </div>
      </div>

      <!-- Unassigned State -->
      <div v-else class="ns-unassigned-state">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <span class="text-secondary small fw-semibold">Assigned worker</span>
          <span class="worker-unassigned-pill badge bg-warning text-dark">
            Unassigned
          </span>
        </div>
        <p class="text-secondary small mb-0">
          No worker assigned to this complaint yet.
        </p>
      </div>

      <!-- Deferred Count Badge (only if carry_forward_count > 0) -->
      <div
        v-if="deferredCountText"
        class="ns-deferred-row mt-3 pt-3 border-top d-flex align-items-center justify-content-between"
      >
        <span class="text-secondary small">Deferred history</span>
        <span class="badge bg-secondary">{{ deferredCountText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-assigned-worker-card {
  background-color: var(--ns-complaint-card-bg, #FFFFFF);
  border: 1px solid var(--ns-complaint-card-border, #E3EAF0);
  border-radius: var(--ns-complaint-card-radius, 18px);
  box-shadow: var(--ns-complaint-card-shadow, 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06));
  overflow: hidden;
}

.ns-assigned-worker-card__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #EEF3F7;
}

.ns-assigned-worker-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: #0E2233;
  margin: 0;
  line-height: 1.2;
}

.ns-assigned-worker-card__body {
  padding: 20px 24px;
}

.ns-worker-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.ns-worker-name {
  font-size: 15px;
  color: #0E2233;
  line-height: 1.3;
}

.worker-unassigned-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.deadline-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.deadline-pill--overdue {
  background-color: #FEE2E2;
  color: #B91C1C;
}

.deadline-pill--due {
  background-color: #EEF3F7;
  color: #334155;
}

.deadline-pill--completed {
  background-color: #DCFCE7;
  color: #166534;
}

.worker-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.worker-status-pill--active {
  background-color: #E6F6EE;
  color: #0F7A4A;
}

.worker-status-pill--inactive {
  background-color: #F1F5F9;
  color: #64748B;
}

.worker-status-pill__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: currentColor;
}

.ns-worker-deadline-row,
.ns-deferred-row {
  border-color: #EEF3F7 !important;
}
</style>
