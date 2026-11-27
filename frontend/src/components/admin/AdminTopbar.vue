<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getInitials } from '../../utils/initials'
import { getLoginRoute } from '../../utils/loginRoute'
import AppIcon from '../AppIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const pageTitles = {
  admin: 'Dashboard',
  'admin-complaints': 'Complaints',
  'admin-complaint-detail': 'Complaint details',
  'admin-triage': 'Triage',
  'admin-hotspots': 'Hotspots',
  'admin-workers': 'Workers',
  'admin-worker-new': 'Add worker',
}
const pageTitle = computed(() => pageTitles[route.name] || 'Admin')

const userName = computed(() => {
  const name = auth.user?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Admin'
})
const initials = computed(() => getInitials(userName.value))
const departmentName = computed(() => {
  const name = auth.user?.department?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Department unavailable'
})
const now = ref(new Date())
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const todayLabel = computed(() => {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(now.value).map(({ type, value }) => [type, value]),
  )
  return `${parts.weekday}, ${parts.day} ${parts.month}`
})
const todayIso = computed(() => {
  const date = now.value
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-')
})
let dateTimer
onMounted(() => {
  dateTimer = window.setInterval(() => { now.value = new Date() }, 60000)
})
onUnmounted(() => window.clearInterval(dateTimer))

function handleLogout() {
  const role = auth.role
  const currentPath = route.path
  auth.logout()
  router.push(getLoginRoute({ role, currentPath }))
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
    <div class="ns-admin-topbar__page">
      <span class="text-secondary">Admin / </span>
      <span class="fw-semibold">{{ pageTitle }}</span>
    </div>
    <span class="ns-admin-topbar__department ms-auto d-none d-md-inline-block"
      :title="departmentName">{{ departmentName }}</span>
    <time class="text-secondary small text-nowrap d-none d-lg-block"
      :datetime="todayIso">{{ todayLabel }}</time>
    <div class="dropdown ms-auto ms-md-0">
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
  z-index: var(--ns-z-sticky);
  display: flex;
  align-items: center;
  gap: var(--ns-space-8);
  height: 64px;
  flex-shrink: 0;
  padding: 0 var(--ns-space-16);
  background-color: var(--ns-surface);
  border-bottom: 1px solid var(--ns-border-default);
  box-shadow: var(--ns-shadow-xs);
}
.ns-admin-topbar__page {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--ns-type-small-size);
}
.ns-admin-topbar > .btn,
.ns-admin-topbar > .dropdown {
  flex-shrink: 0;
}
.ns-admin-topbar > .btn {
  min-width: 44px;
}
#admin-user-menu > span:not(.ns-admin-topbar__avatar) {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ns-admin-topbar .dropdown-item {
  min-height: 44px;
  display: flex;
  align-items: center;
}
.ns-admin-topbar__department {
  max-width: 12rem;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: var(--ns-space-4) var(--ns-space-12);
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-teal-100);
  color: var(--ns-teal-700);
  font-size: var(--ns-type-small-size);
}
.ns-admin-topbar__avatar {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-teal-100);
  color: var(--ns-teal-700);
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
    padding: 0 var(--ns-space-32);
    gap: var(--ns-space-16);
  }
}
</style>
