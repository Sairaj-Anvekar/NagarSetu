<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppCard from '../components/AppCard.vue'
import AdminLoginForm from '../components/AdminLoginForm.vue'
import WorkerLoginForm from '../components/WorkerLoginForm.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const activeTab = ref('admin')

function goHome() {
  if (auth.isAdmin) {
    router.push('/admin')
  } else if (auth.isWorker) {
    router.push('/worker')
  }
}

onMounted(() => {
  if (auth.isAuthenticated) {
    goHome()
  }
})
</script>

<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-5">
        <div
          v-if="route.query.reason === 'expired'"
          class="alert alert-warning mb-4"
          role="alert"
        >
          Your session has expired. Please log in again.
        </div>

        <AppCard title="Sign in">
          <div class="nav nav-pills nav-fill mb-4" role="tablist">
            <button
              type="button"
              class="nav-link"
              role="tab"
              :aria-selected="activeTab === 'admin'"
              :class="{ active: activeTab === 'admin' }"
              @click="activeTab = 'admin'"
            >
              Admin
            </button>
            <button
              type="button"
              class="nav-link"
              role="tab"
              :aria-selected="activeTab === 'worker'"
              :class="{ active: activeTab === 'worker' }"
              @click="activeTab = 'worker'"
            >
              Worker
            </button>
          </div>

          <AdminLoginForm v-if="activeTab === 'admin'" @success="goHome" />
          <WorkerLoginForm v-else-if="activeTab === 'worker'" @success="goHome" />
        </AppCard>
      </div>
    </div>
  </div>
</template>