<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getInitials } from '../../utils/initials'
import AppIcon from '../AppIcon.vue'

const router = useRouter()
const auth = useAuthStore()

const userName = computed(() => {
  const name = auth.user?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Admin'
})
const initials = computed(() => getInitials(userName.value))

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="ns-admin-topbar">
    <button
      type="button"
      class="btn btn-light d-lg-none"
      aria-label="Open menu"
      aria-controls="adminSidebar"
      data-bs-toggle="offcanvas"
      data-bs-target="#adminSidebar"
    >
      <AppIcon name="menu" />
    </button>
    <div class="dropdown ms-auto">
      <button
        id="admin-user-menu"
        type="button"
        class="btn btn-light d-flex align-items-center gap-2"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        :aria-label="`${userName} user menu`"
      >
        <span class="ns-admin-topbar__avatar" aria-hidden="true">{{ initials }}</span>
        <span class="d-none d-sm-inline">{{ userName }}</span>
        <AppIcon name="chevron-down" />
      </button>
      <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="admin-user-menu">
        <li>
          <div class="dropdown-header">
            <div class="text-body fw-semibold">{{ userName }}</div>
            <div class="text-secondary">Administrator</div>
          </div>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <button type="button" class="dropdown-item" @click="handleLogout">
            <AppIcon name="logout" class="me-2" />
            Log out
          </button>
        </li>
      </ul>
    </div>
  </header>
</template>

<style scoped>
.ns-admin-topbar {
  position: sticky;
  top: 0;
  z-index: 1020;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 64px;
  flex-shrink: 0;
  padding: 0 1rem;
  background-color: var(--ns-paper);
  border-bottom: 1px solid var(--ns-line);
}
.ns-admin-topbar__avatar {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-info-bg);
  color: var(--ns-harbour);
  font-size: 0.8125rem;
  font-weight: 600;
}
.ns-admin-topbar .dropdown-menu {
  background-color: var(--ns-paper);
  border-color: var(--ns-line);
  border-radius: var(--ns-radius-control);
  box-shadow: var(--ns-shadow-pop);
  max-width: calc(100vw - 2rem);
}
.ns-admin-topbar .dropdown-header {
  white-space: normal;
  overflow-wrap: anywhere;
}
@media (min-width: 768px) {
  .ns-admin-topbar {
    padding: 0 2rem;
  }
}
</style>
