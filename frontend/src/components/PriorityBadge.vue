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
  critical: { label: 'Critical', className: 'ns-badge--critical' },
  high: { label: 'High', className: 'ns-badge--high' },
  medium: { label: 'Medium', className: 'ns-badge--medium' },
  low: { label: 'Low', className: 'ns-badge--low' },
}

const badgeInfo = computed(() => {
  return (
    priorityConfig[props.priority] ?? {
      label: props.priority,
      className: 'ns-badge--low',
    }
  )
})
</script>

<template>
  <span class="ns-badge" :class="badgeInfo.className">{{ badgeInfo.label }}</span>
</template>
