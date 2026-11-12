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
          <AppIcon name="tasks" :size="22" />
          <span class="ns-worker-tab-bar__label">Tasks</span>
        </a>
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
