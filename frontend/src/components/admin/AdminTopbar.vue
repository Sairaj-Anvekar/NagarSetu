<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../AppIcon.vue'

const route = useRoute()

const deeperRoutes = {
  'admin-complaint-detail': {
    parent: { name: 'Complaints', to: { name: 'admin-complaints' } },
    current: 'Complaint details',
  },
  'admin-worker-new': {
    parent: { name: 'Workers', to: { name: 'admin-workers' } },
    current: 'Add worker',
  },
}

const breadcrumbTrail = computed(() => {
  if (deeperRoutes[route.name]) {
    return deeperRoutes[route.name]
  }
  const path = route.path || ''
  if (path.startsWith('/admin/complaints/') && path !== '/admin/complaints') {
    return deeperRoutes['admin-complaint-detail']
  }
  if (path === '/admin/workers/new' || path.startsWith('/admin/workers/new')) {
    return deeperRoutes['admin-worker-new']
  }
  return null
})

const now = ref(new Date())
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const todayLabel = computed(() => {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(now.value).map(({ type, value }) => [type, value]),
  )
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`
})

const todayIso = computed(() => {
  const date = now.value
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
})

let dateTimer
onMounted(() => {
  dateTimer = window.setInterval(() => {
    now.value = new Date()
  }, 60000)
})
onUnmounted(() => window.clearInterval(dateTimer))
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
    <nav class="ns-admin-topbar__page" aria-label="Breadcrumb">
      <template v-if="breadcrumbTrail">
        <RouterLink
          class="ns-admin-topbar__crumb-link text-decoration-none"
          :to="breadcrumbTrail.parent.to"
        >
          {{ breadcrumbTrail.parent.name }}
        </RouterLink>
        <span class="ns-admin-topbar__crumb-sep text-secondary mx-1" aria-hidden="true">
          &gt;
        </span>
        <span class="fw-semibold text-body">{{ breadcrumbTrail.current }}</span>
      </template>
      <span v-else class="text-secondary fw-medium">NagarSetu admin</span>
    </nav>
    <time class="text-secondary small text-nowrap ms-auto" :datetime="todayIso">
      {{ todayLabel }}
    </time>
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
  display: flex;
  align-items: center;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--ns-type-small-size);
}
.ns-admin-topbar__crumb-link {
  color: var(--ns-teal-700);
  font-weight: 500;
}
.ns-admin-topbar__crumb-link:hover {
  color: var(--ns-teal-800);
  text-decoration: underline !important;
}
.ns-admin-topbar__crumb-link:focus-visible {
  outline: 2px solid var(--ns-teal-300) !important;
  outline-offset: var(--ns-focus-ring-offset);
  border-radius: var(--ns-radius-control);
}
.ns-admin-topbar__crumb-sep {
  user-select: none;
}
.ns-admin-topbar > .btn {
  flex-shrink: 0;
  min-width: 44px;
}
@media (min-width: 768px) {
  .ns-admin-topbar {
    padding: 0 var(--ns-space-32);
    gap: var(--ns-space-16);
  }
}
</style>