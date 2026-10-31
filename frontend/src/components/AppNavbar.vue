<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BrandMark from './BrandMark.vue'

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-md ns-navbar" data-bs-theme="dark">
    <div class="container">
      <RouterLink class="navbar-brand d-inline-flex align-items-center gap-2" to="/">
        <BrandMark />
        <span>NagarSetu</span>
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto">
          <li v-if="!auth.isAuthenticated" class="nav-item">
            <RouterLink class="nav-link" to="/login">Login</RouterLink>
          </li>
          <li v-if="auth.isAdmin" class="nav-item">
            <RouterLink class="nav-link" to="/admin">Admin</RouterLink>
          </li>
          <li v-if="auth.isWorker" class="nav-item">
            <RouterLink class="nav-link" to="/worker">Worker</RouterLink>
          </li>
          <li v-if="auth.isAuthenticated" class="nav-item">
            <button
              type="button"
              class="btn btn-outline-light btn-sm"
              @click="handleLogout"
            >
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>