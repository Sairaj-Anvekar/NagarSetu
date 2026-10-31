<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="ns-empty-state">
    <div class="ns-empty-state__icon">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 4h16l2 10v6H2v-6L4 4Z" />
        <path d="M2 14h6l2 3h4l2-3h6" />
      </svg>
    </div>
    <h3 class="ns-empty-state__title">{{ title }}</h3>
    <p v-if="message" class="ns-empty-state__message">{{ message }}</p>
    <div v-if="$slots.default" class="ns-empty-state__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ns-empty-state {
  padding: 2rem 1rem;
  text-align: center;
  overflow-wrap: anywhere;
}

.ns-empty-state__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-neutral-bg);
  color: var(--ns-neutral-fg);
}

.ns-empty-state__title {
  margin: 0;
  color: var(--ns-ink);
  font-family: var(--ns-font-display);
  font-size: 1.125rem;
  font-weight: 600;
}

.ns-empty-state__message {
  max-width: 32rem;
  margin: 0.5rem auto 0;
  color: var(--ns-slate);
}

.ns-empty-state__action {
  margin-top: 1.25rem;
}
</style>
