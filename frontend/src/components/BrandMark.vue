<script setup>
defineProps({
  size: {
    type: Number,
    default: 28,
  },
})
</script>

<template>
  <!-- PLACEHOLDER: replace with the official NagarSetu logo -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="32" rx="8" fill="#1E9C95" />
    <path
      d="M10 23V9l12 14V9"
      stroke="#fff"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
