<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Offcanvas } from 'bootstrap'
import AdminSidebar from './AdminSidebar.vue'
import AdminTopbar from './AdminTopbar.vue'

const sidebarEl = ref(null)
const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    if (window.innerWidth < 992 && sidebarEl.value) {
      Offcanvas.getInstance(sidebarEl.value)?.hide()
    }
  },
)
</script>

<template>
  <div class="ns-admin-layout">
    <a class="ns-admin-layout__skip visually-hidden-focusable" href="#admin-main">
      Skip to content
    </a>
    <aside
      id="adminSidebar"
      ref="sidebarEl"
      class="offcanvas-lg offcanvas-start ns-admin-layout__sidebar"
      tabindex="-1"
      aria-labelledby="admin-sidebar-brand"
    >
      <button
        type="button"
        class="btn-close btn-close-white d-lg-none ns-admin-layout__close"
        data-bs-dismiss="offcanvas"
        data-bs-target="#adminSidebar"
        aria-label="Close menu"
      ></button>
      <AdminSidebar />
    </aside>
    <div class="ns-admin-layout__column">
      <AdminTopbar />
      <main id="admin-main" tabindex="-1">
        <div class="ns-admin-layout__content">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.ns-admin-layout {
  --ns-admin-sidebar-width: 264px;
  display: flex;
  min-height: 100vh;
  background-color: var(--ns-app-bg);
}
.ns-admin-layout__sidebar {
  --bs-offcanvas-width: var(--ns-admin-sidebar-width);
  width: var(--ns-admin-sidebar-width);
  flex-shrink: 0;
  background-color: var(--ns-navy) !important;
  overflow-y: auto;
}
.ns-admin-layout__close {
  position: absolute;
  top: var(--ns-space-8);
  right: var(--ns-space-4);
  width: 44px;
  height: 44px;
  padding: 0;
}
.ns-admin-layout__column {
  flex: 1;
  min-width: 0;
}
.ns-admin-layout__column > main {
  min-height: calc(100vh - 64px);
  background-color: var(--ns-app-bg);
  background-image: linear-gradient(to bottom, var(--ns-teal-50), var(--ns-app-bg));
  background-size: 100% 200px;
  background-repeat: no-repeat;
}
.ns-admin-layout__content {
  max-width: var(--ns-admin-content-max-width);
  margin: 0 auto;
  padding: var(--ns-space-24) var(--ns-space-16);
}
.ns-admin-layout__skip:focus {
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
@media (min-width: 768px) {
  .ns-admin-layout__content {
    padding-inline: var(--ns-space-32);
  }
}
@media (min-width: 992px) {
  .ns-admin-layout__sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: var(--ns-z-sticky);
  }
  .ns-admin-layout__column {
    margin-left: var(--ns-admin-sidebar-width);
  }
}
</style>
