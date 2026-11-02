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
  display: flex;
  min-height: 100vh;
  background-color: var(--ns-mist);
}
.ns-admin-layout__sidebar {
  --bs-offcanvas-width: 256px;
  width: 256px;
  flex-shrink: 0;
  background-color: var(--ns-navy) !important;
  overflow-y: auto;
}
.ns-admin-layout__close {
  position: absolute;
  top: 1rem;
  right: 0.75rem;
}
.ns-admin-layout__column {
  flex: 1;
  min-width: 0;
}
.ns-admin-layout__content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
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
    padding-inline: 32px;
  }
}
@media (min-width: 992px) {
  .ns-admin-layout__sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
  }
}
</style>
