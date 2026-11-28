<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useTriageBadgeStore } from '../../stores/triageBadge'
import { getInitials } from '../../utils/initials'
import { getLoginRoute } from '../../utils/loginRoute'
import { labelOf } from '../../utils/labelOf'
import BrandMark from '../BrandMark.vue'
import AppIcon from '../AppIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const triageBadgeStore = useTriageBadgeStore()

const userName = computed(() => {
  const name = auth.user?.name
  return typeof name === 'string' && name.trim() ? name.trim() : 'Admin'
})
const departmentName = computed(() => {
  return labelOf(auth.user?.department, 'Department unavailable')
})
const pendingTriageCount = computed(() => triageBadgeStore.pendingCount)

onMounted(() => {
  triageBadgeStore.fetchPendingCount()
})

function handleLogout() {
  const role = auth.role || 'admin'
  const currentPath = route?.path || '/admin'
  auth.logout()
  const target = getLoginRoute({ role, currentPath })
  if (router?.push) {
    router.push(target)
  }
}
</script>

<template>
  <div class="ns-admin-sidebar">
    <div class="ns-admin-sidebar__brand">
      <BrandMark :size="28" />
      <div class="ns-admin-sidebar__brand-text">
        <span id="admin-sidebar-brand">NagarSetu</span>
        <span class="ns-admin-sidebar__caption">Admin Console</span>
      </div>
    </div>
    <nav aria-label="Admin navigation">
      <p class="ns-admin-sidebar__section-label">Overview</p>
      <ul class="ns-admin-sidebar__links">
        <li>
          <RouterLink class="ns-admin-sidebar__link" :to="{ name: 'admin' }">
            <AppIcon name="dashboard" />
            <span>Dashboard</span>
          </RouterLink>
        </li>
      </ul>
      <p class="ns-admin-sidebar__section-label">Manage</p>
      <ul class="ns-admin-sidebar__links">
        <li>
          <RouterLink class="ns-admin-sidebar__link" :to="{ name: 'admin-complaints' }">
            <AppIcon name="tasks" />
            <span>Complaints</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink class="ns-admin-sidebar__link" to="/admin/triage">
            <AppIcon name="triage" />
            <span>Triage</span>
            <span
              v-if="pendingTriageCount > 0"
              class="ns-admin-sidebar__badge"
              data-test="triage-badge"
            >
              {{ pendingTriageCount }}
            </span>
          </RouterLink>
        </li>
        <li>
          <RouterLink class="ns-admin-sidebar__link" :to="{ name: 'admin-hotspots' }">
            <AppIcon name="map-pin" />
            <span>Hotspots</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink class="ns-admin-sidebar__link" :to="{ name: 'admin-workers' }">
            <AppIcon name="users" />
            <span>Workers</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
    <div
      class="ns-admin-sidebar__user"
      :aria-label="`User profile: ${userName}`"
    >
      <div class="ns-admin-sidebar__user-profile">
        <span class="ns-admin-sidebar__avatar" aria-hidden="true">{{ getInitials(userName) }}</span>
        <div class="ns-admin-sidebar__brand-text ns-admin-sidebar__user-details">
          <span class="fw-semibold ns-admin-sidebar__user-name">{{ userName }}</span>
          <span class="ns-admin-sidebar__caption">{{ departmentName }}</span>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-outline-light btn-sm ns-admin-sidebar__logout"
        aria-label="Log out"
        @click="handleLogout"
      >
        <AppIcon name="logout" aria-hidden="true" />
        <span>Log out</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ns-admin-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(to bottom, var(--ns-navy-900), var(--ns-navy-800));
}
.ns-admin-sidebar__user {
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-12);
  margin-top: auto;
  padding: var(--ns-space-16);
  border-top: 1px solid var(--ns-navy-700);
  color: var(--ns-paper);
}
.ns-admin-sidebar__user-profile {
  display: flex;
  align-items: center;
  gap: var(--ns-space-12);
  min-width: 0;
}
.ns-admin-sidebar__user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ns-admin-sidebar__user-name {
  line-height: var(--ns-type-body-line-height);
  overflow-wrap: anywhere;
  word-break: break-word;
}
.ns-admin-sidebar__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ns-space-8);
  min-height: 44px;
  width: 100%;
  border-color: var(--ns-navy-600);
  color: var(--ns-navy-100);
  font-weight: 500;
  border-radius: var(--ns-radius-control);
}
.ns-admin-sidebar__logout:hover {
  background-color: var(--ns-navy-700);
  border-color: var(--ns-navy-500);
  color: var(--ns-paper);
}
.ns-admin-sidebar__logout:focus-visible {
  outline: 2px solid var(--ns-teal-300) !important;
  outline-offset: var(--ns-focus-ring-offset);
}
.ns-admin-sidebar__avatar {
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  height: 40px;
  border-radius: var(--ns-radius-control);
  background-color: var(--ns-navy-700);
  color: var(--ns-teal-200);
  font-weight: var(--ns-type-overline-weight);
}
.ns-admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--ns-space-12);
  min-height: 80px;
  padding: var(--ns-space-16);
  padding-right: var(--ns-space-48);
  color: var(--ns-paper);
  font-family: var(--ns-font-display);
  font-weight: 600;
}
.ns-admin-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ns-admin-sidebar__caption {
  margin-top: var(--ns-space-4);
  color: var(--ns-navy-200);
  font-family: var(--ns-type-caption-family);
  font-size: var(--ns-type-caption-size);
  font-weight: var(--ns-type-caption-weight);
  line-height: var(--ns-type-caption-line-height);
}
.ns-admin-sidebar__links {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0 var(--ns-space-16) var(--ns-space-16);
  list-style: none;
}
.ns-admin-sidebar__section-label {
  margin: 0;
  padding: var(--ns-space-8) var(--ns-space-24);
  color: var(--ns-navy-200);
  font-family: var(--ns-type-overline-family);
  font-size: var(--ns-type-overline-size);
  font-weight: var(--ns-type-overline-weight);
  line-height: var(--ns-type-overline-line-height);
  letter-spacing: var(--ns-type-overline-letter-spacing);
  text-transform: uppercase;
}
.ns-admin-sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  border-radius: var(--ns-radius-control);
  color: var(--ns-navy-200);
  text-decoration: none;
}
.ns-admin-sidebar__link:hover {
  background-color: color-mix(in srgb, var(--ns-paper) 6%, transparent);
  color: var(--ns-paper);
}
.ns-admin-sidebar__link[aria-current='page'] {
  background-color: color-mix(in srgb, var(--ns-paper) 12%, transparent);
  color: var(--ns-paper);
}
.ns-admin-sidebar__link[aria-current='page']::before {
  content: '';
  position: absolute;
  inset-block: var(--ns-space-8);
  left: 0;
  width: 3px;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-span);
}
.ns-admin-sidebar__link[aria-current='page'] :deep(svg) {
  color: var(--ns-span);
}
.ns-admin-sidebar__link:focus-visible {
  outline: 2px solid var(--ns-teal-300) !important;
  outline-offset: var(--ns-focus-ring-offset);
}
.ns-admin-sidebar__link :deep(svg) {
  flex-shrink: 0;
}
.ns-admin-sidebar__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--ns-radius-pill);
  background-color: var(--ns-teal-400);
  color: var(--ns-navy-900);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
@media (prefers-reduced-motion: no-preference) {
  .ns-admin-sidebar__link {
    transition:
      background-color var(--ns-duration-fast) var(--ns-easing),
      color var(--ns-duration-fast) var(--ns-easing);
  }
}
</style>
