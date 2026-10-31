<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getSafeRedirect } from '../utils/redirect'
import AppCard from '../components/AppCard.vue'
import AdminLoginForm from '../components/AdminLoginForm.vue'
import WorkerLoginForm from '../components/WorkerLoginForm.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const activeTab = ref('admin')

function goHome() {
  const target = getSafeRedirect(route.query.redirect)
  if (target !== null && auth.isAuthenticated) {
    router.push(target)
  } else if (auth.isAdmin) {
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
  <div class="container ns-login">
    <div class="row align-items-center g-4 g-lg-5">
      <section class="col-lg-6 ns-login-intro" aria-labelledby="login-heading">
        <p class="ns-login-eyebrow">Civic grievance management</p>
        <h1 id="login-heading">Better service.<br />Every day.</h1>
        <p class="ns-login-summary">
          A focused workspace for the people who keep our city moving. Sign in to get started with
          your day.
        </p>
        <div class="ns-login-roles">
          <div>
            <span class="ns-login-role-number" aria-hidden="true">01</span>
            <div>
              <h2>For administrators</h2>
              <p>Coordinate civic grievance resolution.</p>
            </div>
          </div>
          <div>
            <span class="ns-login-role-number" aria-hidden="true">02</span>
            <div>
              <h2>For workers</h2>
              <p>Stay focused on your assigned tasks.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="col-lg-6" aria-labelledby="signin-heading">
        <div class="ns-login-form-wrap">
          <div
            v-if="route.query.reason === 'expired'"
            class="alert alert-warning mb-4"
            role="alert"
          >
            Your session has expired. Please log in again.
          </div>

          <AppCard class="ns-login-card">
            <p class="ns-login-eyebrow">Your workspace</p>
            <h2 id="signin-heading" class="h3 mb-2">Welcome back</h2>
            <p class="text-secondary mb-4">Choose your role to sign in.</p>

            <div
              class="nav nav-pills nav-fill ns-login-tabs mb-4"
              role="tablist"
              aria-label="Sign-in role"
            >
              <button
                id="admin-login-tab"
                type="button"
                class="nav-link"
                role="tab"
                aria-controls="login-panel"
                :aria-selected="activeTab === 'admin'"
                :class="{ active: activeTab === 'admin' }"
                @click="activeTab = 'admin'"
              >
                Admin
              </button>
              <button
                id="worker-login-tab"
                type="button"
                class="nav-link"
                role="tab"
                aria-controls="login-panel"
                :aria-selected="activeTab === 'worker'"
                :class="{ active: activeTab === 'worker' }"
                @click="activeTab = 'worker'"
              >
                Worker
              </button>
            </div>

            <div id="login-panel" role="tabpanel" :aria-labelledby="`${activeTab}-login-tab`">
              <AdminLoginForm v-if="activeTab === 'admin'" @success="goHome" />
              <WorkerLoginForm v-else-if="activeTab === 'worker'" @success="goHome" />
            </div>
            <p class="ns-login-help">Need access? Contact your administrator.</p>
          </AppCard>
          <p class="ns-login-connection">An internet connection is required to use NagarSetu.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ns-login {
  padding-block: clamp(2rem, 7vw, 6rem);
}

.ns-login-eyebrow {
  margin-bottom: 1rem;
  color: var(--ns-harbour);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ns-login-intro h1 {
  margin-bottom: 1.5rem;
  font-size: clamp(2.25rem, 4.5vw, 3.75rem);
  line-height: 1.15;
  letter-spacing: -0.045em;
}

.ns-login-summary {
  max-width: 28rem;
  color: var(--ns-slate);
  font-size: 1.0625rem;
  line-height: 1.75;
}

.ns-login-roles {
  display: grid;
  gap: 1.5rem;
  margin-top: 2.5rem;
}

.ns-login-roles > div {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.ns-login-role-number {
  display: grid;
  place-items: center;
  flex: 0 0 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-control);
  background: var(--ns-paper);
  color: var(--ns-harbour);
  font-size: 0.75rem;
  font-weight: 700;
}

.ns-login-roles h2 {
  margin-bottom: 0.25rem;
  font-size: 0.9375rem;
}

.ns-login-roles p {
  margin: 0;
  color: var(--ns-slate);
  font-size: 0.875rem;
}

.ns-login-form-wrap {
  max-width: 30rem;
  margin-inline: auto;
}

.ns-login-card {
  border-top: 3px solid var(--ns-span);
}

.ns-login-card :deep(.card-body) {
  padding: clamp(1.25rem, 3vw, 2.5rem);
}

.ns-login-tabs {
  padding: 0.375rem;
  gap: 0.375rem;
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  background: var(--ns-mist);
}

.ns-login-tabs .nav-link {
  min-height: 2.75rem;
}

.ns-login-tabs .nav-link:focus-visible {
  outline: 2px solid var(--ns-harbour);
  outline-offset: 2px;
}

.ns-login-card :deep(.form-label) {
  font-size: 0.875rem;
  font-weight: 600;
}

.ns-login-card :deep(.form-control) {
  min-height: 3rem;
}

.ns-login-card :deep(button[type='submit']) {
  min-height: 3rem;
  margin-top: 0.5rem;
}

.ns-login-help {
  margin: 1.5rem 0 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--ns-line);
  color: var(--ns-slate);
  font-size: 0.8125rem;
  text-align: center;
}

.ns-login-connection {
  margin: 1.25rem 0 0;
  color: var(--ns-slate);
  font-size: 0.75rem;
  text-align: center;
}

@media (max-width: 991.98px) {
  .ns-login-intro {
    max-width: 30rem;
    margin-inline: auto;
  }

  .ns-login-roles {
    display: none;
  }
}
</style>
