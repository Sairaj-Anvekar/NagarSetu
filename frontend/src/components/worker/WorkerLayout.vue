<script setup>
import { RouterView } from 'vue-router'
import { useOnlineStatus } from '../../composables/useOnlineStatus'
import WorkerAppBar from './WorkerAppBar.vue'
import WorkerTabBar from './WorkerTabBar.vue'

const { isOnline } = useOnlineStatus()
</script>

<template>
  <div class="ns-worker-layout">
    <a class="ns-worker-layout__skip visually-hidden-focusable" href="#worker-main">
      Skip to content
    </a>

    <WorkerAppBar />

    <div v-if="!isOnline" class="ns-worker-layout__offline" role="status">
      You are offline. NagarSetu needs an internet connection to load and update tasks.
    </div>

    <main id="worker-main" tabindex="-1">
      <div class="ns-worker-layout__content">
        <RouterView />
      </div>
    </main>

    <WorkerTabBar />
  </div>
</template>

<style scoped>
.ns-worker-layout {
  min-height: 100vh;
  background-color: var(--ns-mist);
  display: flex;
  flex-direction: column;
}

.ns-worker-layout__skip:focus {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1080;
  padding: 0.75rem 1rem;
  background-color: var(--ns-paper);
  color: var(--ns-ink);
  outline: 2px solid var(--ns-span);
  outline-offset: 2px;
}

.ns-worker-layout__offline {
  background-color: var(--ns-warning-bg);
  color: var(--ns-warning-fg);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  border-bottom: 1px solid rgba(138, 90, 0, 0.15);
}

#worker-main {
  flex: 1;
  outline: none;
}

.ns-worker-layout__content {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom) + 16px);
}
</style>
