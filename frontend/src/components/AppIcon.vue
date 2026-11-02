<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
})

const names = ['dashboard', 'users', 'menu', 'logout', 'chevron-down']
</script>

<template>
  <svg
    v-if="names.includes(name)"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2.1.7 3.5 2.6 3.5 5.6" />
    </template>
    <path v-else-if="name === 'menu'" d="M4 6h16M4 12h16M4 18h16" />
    <template v-else-if="name === 'logout'">
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </template>
    <path v-else-if="name === 'chevron-down'" d="M6 9l6 6 6-6" />
  </svg>
</template>
