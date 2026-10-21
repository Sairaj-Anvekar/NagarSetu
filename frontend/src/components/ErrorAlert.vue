<script setup>
defineProps({
  message: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Something went wrong',
  },
  showRetry: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div class="alert alert-danger" role="alert">
    <h6 class="alert-heading fw-bold mb-2">{{ title }}</h6>
    <p class="mb-0">{{ message }}</p>
    <div v-if="showRetry" class="mt-3">
      <button type="button" class="btn btn-outline-danger btn-sm" @click="emit('retry')">
        Try again
      </button>
    </div>
  </div>
</template>
