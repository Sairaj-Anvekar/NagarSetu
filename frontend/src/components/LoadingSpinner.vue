<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: 'Loading...',
  },
  size: {
    type: String,
    default: 'md',
    validator(value) {
      return ['sm', 'md', 'lg'].includes(value)
    },
  },
  centered: {
    type: Boolean,
    default: false,
  },
})

const spinnerClasses = computed(() => [
  'spinner-border',
  { 'spinner-border-sm': props.size === 'sm' },
])

const spinnerStyle = computed(() => {
  if (props.size === 'lg') {
    return { width: '3rem', height: '3rem' }
  }
  return undefined
})
</script>

<template>
  <div v-if="centered" class="d-flex justify-content-center py-4">
    <div :class="spinnerClasses" :style="spinnerStyle" role="status">
      <span class="visually-hidden">{{ label }}</span>
    </div>
  </div>
  <div v-else :class="spinnerClasses" :style="spinnerStyle" role="status">
    <span class="visually-hidden">{{ label }}</span>
  </div>
</template>
