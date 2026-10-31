<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator(value) {
      return ['Submitted', 'In-Progress', 'Completed'].includes(value)
    },
  },
})

const statusClass = computed(() => {
  switch (props.status) {
    case 'Submitted':
      return 'ns-badge--submitted'
    case 'In-Progress':
      return 'ns-badge--in-progress'
    case 'Completed':
      return 'ns-badge--completed'
    default:
      return 'ns-badge--unknown'
  }
})
</script>

<template>
  <span class="ns-badge" :class="statusClass">{{ status }}</span>
</template>
