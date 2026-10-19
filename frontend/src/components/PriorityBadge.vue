<script setup>
import { computed } from 'vue'

const props = defineProps({
  priority: {
    type: String,
    required: true,
    validator(value) {
      return ['critical', 'high', 'medium', 'low'].includes(value)
    },
  },
})

const priorityConfig = {
  critical: { label: 'Critical', className: 'text-bg-danger' },
  high: { label: 'High', className: 'text-bg-warning' },
  medium: { label: 'Medium', className: 'text-bg-secondary' },
  low: { label: 'Low', className: 'text-bg-light border text-dark' },
}

const badgeInfo = computed(() => {
  return (
    priorityConfig[props.priority] ?? {
      label: props.priority,
      className: 'text-bg-light border text-dark',
    }
  )
})
</script>

<template>
  <span class="badge rounded-pill" :class="badgeInfo.className">{{ badgeInfo.label }}</span>
</template>
