<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getLoginRoute } from '../utils/loginRoute'
import { labelOf } from '../utils/labelOf'
import WorkerHeader from '../components/worker/WorkerHeader.vue'
import AccountProfileCard from '../components/worker/AccountProfileCard.vue'
import AccountInfoRows from '../components/worker/AccountInfoRows.vue'
import InstallCard from '../components/worker/InstallCard.vue'

const router = useRouter()
const auth = useAuthStore()

const workerName = computed(() => {
  const name = auth.user?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Worker'
})

const department = computed(() => labelOf(auth.user?.department))
const zone = computed(() => labelOf(auth.user?.zone))
const phone = computed(() => auth.user?.phone || '')

function handleLogout() {
  const role = auth.role
  const currentPath = router.currentRoute.value?.path
  auth.logout()
  router.push(getLoginRoute({ role, currentPath }))
}
</script>

<template>
  <div class="worker-account-page">
    <WorkerHeader variant="title" title="Account" />

    <main class="worker-account-page__content">
      <div class="worker-account-page__profile-wrap">
        <AccountProfileCard :name="workerName" />
      </div>

      <AccountInfoRows
        :department="department"
        :zone="zone"
        :phone="phone"
      />

      <InstallCard />

      <button
        type="button"
        class="btn btn-outline-secondary worker-account-logout-btn w-100"
        @click="handleLogout"
      >
        Log out
      </button>

      <p class="worker-account-footer-note mb-0">
        An internet connection is required to use NagarSetu.
      </p>
    </main>
  </div>
</template>

<style scoped>
.worker-account-page {
  min-height: 100%;
  background-color: var(--ns-worker-page-bg, #f3f6fa);
  padding-bottom: calc(var(--ns-worker-tab-height, 76px) + 24px);
  box-sizing: border-box;
}

.worker-account-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 24px;
}

.worker-account-page__profile-wrap {
  margin-top: -26px;
  position: relative;
  z-index: 2;
}

.worker-account-logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  background-color: #ffffff;
  border: 1.5px solid #fca5a5;
  color: #b91c1c;
  font-family: var(--ns-font-display);
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  cursor: pointer;
  transition:
    background-color var(--ns-duration-fast, 140ms) ease,
    border-color var(--ns-duration-fast, 140ms) ease,
    color var(--ns-duration-fast, 140ms) ease;
}

.worker-account-logout-btn:hover {
  background-color: #fef2f2;
  border-color: #f87171;
  color: #991b1b;
}

.worker-account-logout-btn:focus-visible {
  outline: 2px solid var(--ns-span, #14a89a);
  outline-offset: 2px;
}

.worker-account-footer-note {
  font-family: var(--ns-font-body);
  font-size: 12px;
  line-height: 1.4;
  color: #5f6f7e;
  text-align: center;
  padding: 8px 16px 0;
}
</style>
