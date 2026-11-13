<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getInitials } from '../utils/initials'
import { useInstallPrompt } from '../composables/useInstallPrompt'
import PageHeader from '../components/PageHeader.vue'
import AppCard from '../components/AppCard.vue'

const router = useRouter()
const auth = useAuthStore()
const { canInstall, isInstalled, isIos, install } = useInstallPrompt()

const workerName = computed(() => {
  const name = auth.user?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Worker'
})

const initials = computed(() => getInitials(workerName.value))

const showInstallSection = computed(() =>
  Boolean(canInstall.value || isInstalled.value || (isIos.value && !isInstalled.value))
)

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="ns-worker-account">
    <PageHeader title="Account" />

    <AppCard class="mb-4">
      <div class="d-flex align-items-center gap-3">
        <div class="ns-worker-account__avatar" aria-hidden="true">
          {{ initials }}
        </div>
        <div>
          <h2 class="ns-worker-account__name h5 mb-1">{{ workerName }}</h2>
          <div class="ns-worker-account__role">Field worker</div>
        </div>
      </div>
    </AppCard>

    <button
      type="button"
      class="btn btn-outline-secondary btn-lg w-100"
      @click="handleLogout"
    >
      Log out
    </button>

    <div v-if="showInstallSection" class="ns-worker-account__install mt-4">
      <AppCard>
        <h3 class="h6 mb-3">Install this app</h3>
        <button
          v-if="canInstall"
          type="button"
          class="btn btn-primary btn-lg w-100 ns-worker-account__install-btn"
          @click="install"
        >
          Install app
        </button>
        <p v-else-if="isInstalled" class="mb-0 ns-worker-account__installed-text">
          App installed
        </p>
        <p v-else-if="isIos && !isInstalled" class="mb-0 ns-worker-account__ios-hint">
          On iPhone: tap Share, then Add to Home Screen.
        </p>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.ns-worker-account__avatar {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-info-bg);
  color: var(--ns-harbour);
  font-family: var(--ns-font-display);
  font-size: 1.25rem;
  font-weight: 600;
}

.ns-worker-account__name {
  font-family: var(--ns-font-display);
  font-weight: 600;
  color: var(--ns-ink);
}

.ns-worker-account__role {
  color: var(--ns-slate);
  font-size: 0.875rem;
}

.ns-worker-account__install-btn {
  min-height: 44px;
}

.ns-worker-account__installed-text,
.ns-worker-account__ios-hint {
  color: var(--ns-slate);
  font-size: 0.875rem;
}
</style>
