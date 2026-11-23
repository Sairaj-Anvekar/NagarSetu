<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../../utils/formatDate'
import { timeLeftLabel } from '../../utils/taskDisplay'

const props = defineProps({
  row: {
    type: Object,
    required: true,
  },
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

function formatCompletedDate(iso) {
  if (!iso || typeof iso !== 'string') return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const formatted = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(d)
    return `Completed ${formatted}`
  } catch {
    return ''
  }
}

const pillInfo = computed(() => {
  const item = props.row
  if (!item) return null

  if (item.status === 'Completed') {
    const completedIso =
      item.resolved_at || item.completed_at || item.resolution?.completed_at || null
    if (completedIso) {
      const label = formatCompletedDate(completedIso)
      if (label) {
        return {
          label,
          tone: 'completed',
          className: 'deadline-pill--completed',
        }
      }
    }
    return null
  }

  const info = timeLeftLabel(item, props.now)
  if (info && info.label) {
    return {
      label: info.label,
      tone: info.tone,
      className:
        info.tone === 'overdue'
          ? 'deadline-pill--overdue ns-overdue-flag'
          : 'deadline-pill--due',
    }
  }

  if (item.is_overdue) {
    return {
      label: 'Overdue',
      tone: 'overdue',
      className: 'deadline-pill--overdue ns-overdue-flag',
    }
  }

  return null
})

const exactDate = computed(() => {
  const item = props.row
  if (!item) return '—'
  return formatDateTime(item.sla_deadline || item.created_at)
})
</script>

<template>
  <div class="deadline-cell">
    <span
      v-if="pillInfo"
      class="deadline-pill"
      :class="pillInfo.className"
    >
      {{ pillInfo.label }}
    </span>
    <span class="deadline-exact">{{ exactDate }}</span>
  </div>
</template>

<style scoped>
.deadline-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.deadline-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 8px;
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

.deadline-exact {
  font-size: 12px;
  color: #5F6F7E;
  line-height: 1.2;
}
</style>
