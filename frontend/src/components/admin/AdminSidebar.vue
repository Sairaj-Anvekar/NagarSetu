<script setup>
import { RouterLink } from 'vue-router'
import BrandMark from '../BrandMark.vue'
import AppIcon from '../AppIcon.vue'
</script>

<template>
  <div class="ns-admin-sidebar">
    <div class="ns-admin-sidebar__brand">
      <BrandMark :size="28" />
      <span id="admin-sidebar-brand">NagarSetu</span>
    </div>
    <nav aria-label="Admin navigation">
      <ul class="ns-admin-sidebar__links">
        <li>
          <RouterLink class="ns-admin-sidebar__link" :to="{ name: 'admin' }">
            <AppIcon name="dashboard" />
            <span>Dashboard</span>
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
  </div>
</template>

<style scoped>
.ns-admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 64px;
  padding: 0 1rem;
  color: white;
  font-family: var(--ns-font-display);
  font-weight: 600;
}
.ns-admin-sidebar__links {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 1rem;
  list-style: none;
}
.ns-admin-sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  border-radius: var(--ns-radius-control);
  color: rgba(255, 255, 255, 0.72);
  text-decoration: none;
}
.ns-admin-sidebar__link:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: white;
}
.ns-admin-sidebar__link[aria-current='page'] {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}
.ns-admin-sidebar__link[aria-current='page'] :deep(svg) {
  color: var(--ns-span);
}
.ns-admin-sidebar__link:focus-visible {
  outline: 2px solid var(--ns-span);
  outline-offset: 2px;
}
.ns-admin-sidebar__link :deep(svg) {
  flex-shrink: 0;
}
</style>
