<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { timeLeftLabel } from '../../utils/taskDisplay'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const displayItems = computed(() => {
  if (!Array.isArray(props.items)) return []
  return props.items.slice(0, 4)
})

function formatZone(zone) {
  if (!zone) return '—'
  if (typeof zone === 'object') return zone.name || '—'
  return String(zone)
}

function formatPriority(priority) {
  if (typeof priority !== 'string' || !priority) return '—'
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
}

function formatOverdue(item) {
  const info = timeLeftLabel(item, props.now)
  if (info && info.label) {
    return info.label
  }
  return 'Overdue'
}

function getWorkerName(item) {
  if (item?.assigned_worker?.name) return item.assigned_worker.name
  if (item?.worker?.name) return item.worker.name
  if (typeof item?.worker_name === 'string') return item.worker_name
  return null
}
</script>

<template>
  <div class="needs-attention-table-wrapper">
    <div v-if="loading" class="needs-attention-loading">
      <div class="spinner-border spinner-border-sm text-secondary" role="status">
        <span class="visually-hidden">Loading overdue complaints...</span>
      </div>
      <span>Loading overdue complaints...</span>
    </div>

    <div v-else-if="error" class="needs-attention-error alert alert-warning mb-0">
      <span>{{ error }}</span>
    </div>

    <div v-else class="table-responsive">
      <table class="needs-attention-table" aria-label="Overdue complaints">
        <thead>
          <tr>
            <th scope="col">Tracking code</th>
            <th scope="col">Category</th>
            <th scope="col">Zone</th>
            <th scope="col">Priority</th>
            <th scope="col">Overdue by</th>
            <th scope="col">Worker</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="displayItems.length === 0" class="needs-attention-empty">
            <td colspan="6" class="text-center py-4">No overdue complaints</td>
          </tr>
          <tr
            v-for="item in displayItems"
            v-else
            :key="item.id"
            class="needs-attention-row"
          >
            <td class="needs-attention-cell font-monospace">
              <RouterLink
                :to="{ name: 'admin-complaint-detail', params: { id: item.id } }"
                class="needs-attention-link"
              >
                {{ item.tracking_code || item.id }}
              </RouterLink>
            </td>
            <td class="needs-attention-cell">{{ item.category || '—' }}</td>
            <td class="needs-attention-cell">{{ formatZone(item.zone) }}</td>
            <td class="needs-attention-cell">
              <span
                class="priority-chip"
                :class="`priority-chip--${String(item.priority || 'medium').toLowerCase()}`"
              >
                {{ formatPriority(item.priority) }}
              </span>
            </td>
            <td class="needs-attention-cell">
              <span class="overdue-pill">
                {{ formatOverdue(item) }}
              </span>
            </td>
            <td class="needs-attention-cell">
              <span v-if="getWorkerName(item)" class="worker-name">
                {{ getWorkerName(item) }}
              </span>
              <span v-else class="unassigned-pill">
                Unassigned
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.needs-attention-table-wrapper {
  width: 100%;
}

.needs-attention-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 16px;
  color: #4B5B6B;
  font-size: 13px;
}

.needs-attention-error {
  font-size: 13px;
  border-radius: 10px;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.needs-attention-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
}

.needs-attention-table thead th {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4B5B6B;
  padding: 10px 12px;
  border-bottom: 1px solid #E3EAF0;
  white-space: nowrap;
  background-color: transparent;
}

.needs-attention-row td {
  padding: 12px;
  vertical-align: middle;
  border-bottom: 1px solid #F1F5F9;
  color: #14202B;
}

.needs-attention-row:last-child td {
  border-bottom: none;
}

.needs-attention-empty td {
  color: #5F6F7E;
  font-size: 13px;
}

.needs-attention-link {
  color: #0B7285;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  min-height: 24px;
}

.needs-attention-link:hover {
  text-decoration: underline;
  color: #0E4F6B;
}

.needs-attention-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
  border-radius: 4px;
}

.priority-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.priority-chip--critical {
  background-color: #FFE4E6;
  color: #9F1239;
}

.priority-chip--high {
  background-color: #FFEDD5;
  color: #9A3412;
}

.priority-chip--medium {
  background-color: #FEF3C7;
  color: #92400E;
}

.priority-chip--low {
  background-color: #E0EEFF;
  color: #1D4ED8;
}

.overdue-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background-color: #FEE2E2;
  color: #B91C1C;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.worker-name {
  color: #14202B;
  font-weight: 500;
}

.unassigned-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background-color: #FEF3C7;
  color: #92400E;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
