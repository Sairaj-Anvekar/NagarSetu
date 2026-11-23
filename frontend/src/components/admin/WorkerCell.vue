<script setup>
import { computed } from 'vue'
import { getInitials } from '../../utils/initials'

const props = defineProps({
  worker: {
    type: [Object, String],
    default: null,
  },
})

const workerName = computed(() => {
  if (!props.worker) return ''
  if (typeof props.worker === 'string') {
    const trimmed = props.worker.trim()
    return trimmed.toLowerCase() === 'unassigned' ? '' : trimmed
  }
  if (typeof props.worker === 'object' && typeof props.worker.name === 'string') {
    const trimmed = props.worker.name.trim()
    return trimmed.toLowerCase() === 'unassigned' ? '' : trimmed
  }
  return ''
})

const initials = computed(() => {
  return workerName.value ? getInitials(workerName.value) : ''
})
</script>

<template>
  <div class="worker-cell">
    <template v-if="workerName">
      <span class="worker-avatar" aria-hidden="true">{{ initials }}</span>
      <span class="worker-name">{{ workerName }}</span>
    </template>
    <span v-else class="worker-unassigned-pill">Unassigned</span>
  </div>
</template>

<style scoped>
.worker-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.worker-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.worker-name {
  font-size: 13px;
  font-weight: 600;
  color: #0E2233;
  line-height: 1.2;
}

.worker-unassigned-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: #FEF3C7;
  color: #92400E;
  letter-spacing: 0.02em;
  line-height: 1;
}
</style>
