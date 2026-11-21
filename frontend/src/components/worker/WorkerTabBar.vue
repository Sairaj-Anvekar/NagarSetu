<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../AppIcon.vue'

const route = useRoute()

const isTasksActive = computed(() => {
  return (
    route.name === 'worker' ||
    route.name === 'worker-task-detail' ||
    route.path === '/worker' ||
    route.path.startsWith('/worker/tasks/')
  )
})
</script>

<template>
  <nav class="ns-worker-tab-bar" aria-label="Worker navigation">
    <div class="ns-worker-tab-bar__row">
      <RouterLink v-slot="{ href, navigate }" :to="{ name: 'worker' }" custom>
        <a
          :href="href"
          class="ns-worker-tab-bar__link"
          :class="{ 'router-link-active': isTasksActive }"
          :aria-current="isTasksActive ? 'page' : undefined"
          @click="navigate"
        >
          <span class="ns-worker-tab-bar__pill"><AppIcon name="tasks" :size="22" /></span>
          <span class="ns-worker-tab-bar__label">Tasks</span>
        </a>
      </RouterLink>
      <RouterLink :to="{ name: 'worker-history' }" class="ns-worker-tab-bar__link">
        <span class="ns-worker-tab-bar__pill"><AppIcon name="clock" :size="22" /></span>
        <span class="ns-worker-tab-bar__label">History</span>
      </RouterLink>
      <RouterLink :to="{ name: 'worker-account' }" class="ns-worker-tab-bar__link">
        <span class="ns-worker-tab-bar__pill"><AppIcon name="user" :size="22" /></span>
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
  z-index: var(--ns-z-sticky);
  box-sizing: border-box;
  height: calc(var(--ns-worker-tab-height) + env(safe-area-inset-bottom, 0px));
  background-color: var(--ns-paper);
  border-top: 1px solid var(--ns-worker-tab-border);
  box-shadow: var(--ns-worker-tab-shadow);
  padding: 0 12px calc(8px + env(safe-area-inset-bottom, 0px));
}

.ns-worker-tab-bar__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  height: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.ns-worker-tab-bar__link {
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--ns-login-text-muted);
  text-decoration: none;
  position: relative;
  padding: 6px 0;
}

.ns-worker-tab-bar__label {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
}

.ns-worker-tab-bar__link[aria-current='page'] {
  color: var(--ns-worker-tab-active);
}

.ns-worker-tab-bar__pill {
  display: grid;
  place-items: center;
  width: 56px;
  height: 30px;
  border-radius: var(--ns-radius-pill);
}
.ns-worker-tab-bar__pill :deep(svg) { stroke-width: 2; }
.ns-worker-tab-bar__link[aria-current='page'] .ns-worker-tab-bar__pill {
  background-color: var(--ns-worker-tab-pill-bg);
}
.ns-worker-tab-bar__link[aria-current='page'] .ns-worker-tab-bar__pill :deep(svg) {
  stroke-width: 2.2;
}
.ns-worker-tab-bar__link[aria-current='page'] .ns-worker-tab-bar__label {
  font-weight: 700;
}

.ns-worker-tab-bar__link:focus-visible {
  outline: 2px solid var(--ns-worker-tab-active);
  outline-offset: -2px;
}
@media (prefers-reduced-motion: no-preference) {
  .ns-worker-tab-bar__link { transition: color var(--ns-duration-base) var(--ns-easing); }
  .ns-worker-tab-bar__pill { transition: background-color var(--ns-duration-base) var(--ns-easing); }
}
@media (prefers-reduced-motion: reduce) {
  .ns-worker-tab-bar__link, .ns-worker-tab-bar__pill { transition: none; }
}
</style>
