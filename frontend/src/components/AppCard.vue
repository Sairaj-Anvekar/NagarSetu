<script setup>
import { useSlots } from 'vue'

defineProps({
  title: {
    type: String,
    default: '',
  },
})

const slots = useSlots()
</script>

<template>
  <div class="card shadow-sm">
    <div v-if="title" class="card-header fw-bold">
      {{ title }}
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>
