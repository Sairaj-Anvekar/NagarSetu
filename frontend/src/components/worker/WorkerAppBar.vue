<script setup>
import BrandMark from '../BrandMark.vue'
</script>

<template>
  <header class="ns-worker-app-bar">
    <div class="ns-worker-app-bar__inner">
      <BrandMark :size="28" />
      <span class="ns-worker-app-bar__title">NagarSetu</span>
    </div>
  </header>
</template>

<style scoped>
.ns-worker-app-bar {
  position: sticky;
  top: 0;
  z-index: 1020;
  background-color: var(--ns-navy);
  color: white;
  min-height: 56px;
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
}

.ns-worker-app-bar__inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
}

.ns-worker-app-bar__title {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
  color: white;
}
</style>
