<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from '../AppIcon.vue'
</script>

<template>
  <nav class="ns-worker-tab-bar" aria-label="Worker navigation">
    <div class="ns-worker-tab-bar__row">
      <RouterLink :to="{ name: 'worker' }" class="ns-worker-tab-bar__link">
        <AppIcon name="tasks" :size="22" />
        <span class="ns-worker-tab-bar__label">Tasks</span>
      </RouterLink>
      <RouterLink :to="{ name: 'worker-history' }" class="ns-worker-tab-bar__link">
        <AppIcon name="history" :size="22" />
        <span class="ns-worker-tab-bar__label">History</span>
      </RouterLink>
      <RouterLink :to="{ name: 'worker-account' }" class="ns-worker-tab-bar__link">
        <AppIcon name="user" :size="22" />
        <span class="ns-worker-tab-bar__label">Account</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.ns-worker-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1020;
  background-color: var(--ns-paper);
  border-top: 1px solid var(--ns-line);
  padding-bottom: env(safe-area-inset-bottom);
}

.ns-worker-tab-bar__row {
  display: flex;
  max-width: 640px;
  margin: 0 auto;
}

.ns-worker-tab-bar__link {
  flex: 1;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ns-slate);
  text-decoration: none;
  position: relative;
  padding: 6px 0;
}

.ns-worker-tab-bar__label {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  margin-top: 2px;
}

.ns-worker-tab-bar__link[aria-current='page'] {
  color: var(--ns-harbour);
}

.ns-worker-tab-bar__link[aria-current='page']::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--ns-harbour);
}

.ns-worker-tab-bar__link:focus-visible {
  outline: 2px solid var(--ns-span);
  outline-offset: -2px;
}
</style>
