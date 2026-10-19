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
      return 'text-bg-info'
    case 'In-Progress':
      return 'text-bg-primary'
    case 'Completed':
      return 'text-bg-success'
    default:
      return 'text-bg-light border text-dark'
  }
})
</script>

<template>
  <span class="badge" :class="statusClass">{{ status }}</span>
</template>
