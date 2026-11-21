<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getSafeRedirect } from '../utils/redirect'
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
  <main class="ns-login">
    <div class="ns-login-frame">
      <section class="ns-login-intro" aria-labelledby="login-heading">
        <div class="ns-login-brand">
          <span class="ns-login-brand-mark" aria-hidden="true">N</span>
          <span>NagarSetu</span>
        </div>
        <p class="ns-login-eyebrow">{{ activeTab === 'worker' ? 'FIELD WORKER' : 'ADMIN' }}</p>
        <h1 id="login-heading">
          {{ activeTab === 'worker' ? "Sign in to see today's tasks" : 'Sign in to your console' }}
        </h1>
      </section>

      <section class="ns-login-sheet" aria-labelledby="signin-heading">
        <h2 id="signin-heading" class="visually-hidden">Sign in</h2>
          <div
            v-if="route.query.reason === 'expired'"
            class="alert alert-warning ns-login-notice"
            role="alert"
          >
            Your session has expired. Please log in again.
          </div>

            <div
              class="nav nav-pills nav-fill ns-login-tabs"
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
        <footer class="ns-login-footer">
          <p class="ns-login-help">Need access? Contact your administrator.</p>
          <p class="ns-login-connection">An internet connection is required to use NagarSetu.</p>
        </footer>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ns-login {
  min-height: 100dvh;
  background: var(--ns-login-switch-bg);
  font-family: var(--ns-font-body);
}
.ns-login-frame {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  width: 100%;
  background: var(--ns-login-navy);
}
.ns-login-intro {
  flex: 0 0 300px;
  padding: 64px 28px 28px;
  color: var(--ns-paper);
  background-image: radial-gradient(circle at 88% 6%, var(--ns-login-glow), transparent 52%),
    linear-gradient(var(--ns-login-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ns-login-grid) 1px, transparent 1px);
  background-size: auto, 28px 28px, 28px 28px;
}
.ns-login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font: 700 22px var(--ns-font-display);
}
.ns-login-brand-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: var(--ns-login-radius-field);
  background: var(--ns-login-brand-gradient);
}
.ns-login-eyebrow {
  display: inline-block;
  margin: 20px 0 12px;
  padding: 5px 10px;
  border-radius: var(--ns-radius-pill);
  background: var(--ns-login-pill-bg);
  color: var(--ns-login-pill-text);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
}
.ns-login-intro h1 {
  margin: 0;
  max-width: 334px;
  color: var(--ns-paper);
  font: 700 28px/1.2 var(--ns-font-display);
}
.ns-login-sheet {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px 24px 28px;
  border-radius: var(--ns-login-radius-sheet) var(--ns-login-radius-sheet) 0 0;
  background: var(--ns-paper);
  box-shadow: var(--ns-login-sheet-shadow);
}
.ns-login-tabs {
  flex-wrap: nowrap;
  padding: 4px;
  border-radius: var(--ns-radius-lg);
  background: var(--ns-login-switch-bg);
}
.ns-login-tabs .nav-link {
  min-height: 44px;
  border-radius: var(--ns-radius-md);
  color: var(--ns-login-control-text);
  font-weight: 600;
}
.ns-login-tabs .nav-link.active {
  background: var(--ns-login-gradient);
  color: var(--ns-paper);
  box-shadow: var(--ns-login-switch-shadow);
}
.ns-login-tabs .nav-link:focus-visible {
  outline: 2px solid var(--ns-login-teal);
  outline-offset: var(--ns-focus-ring-offset);
}
.ns-login-footer { margin-top: auto; text-align: center; }
.ns-login-help { margin: 0; color: var(--ns-login-text-muted); font-size: 13px; font-weight: 500; }
.ns-login-connection { margin: 6px 0 0; color: var(--ns-login-text-secondary); font-size: 12px; }
.ns-login-notice { margin: 0; padding: 8px 12px; font-size: 13px; }
@media (max-height: 700px) {
  .ns-login-intro { flex-basis: 180px; padding: 16px 28px; }
  .ns-login-eyebrow { margin: 8px 0; padding-block: 3px; }
  .ns-login-sheet { gap: 8px; padding: 16px 24px; }
}
@media (min-width: 768px) {
  .ns-login { display: grid; place-items: center; padding: 24px; }
  .ns-login-frame { max-width: 440px; min-height: min(796px, calc(100dvh - 48px)); border-radius: var(--ns-login-radius-sheet); }
  .ns-login-intro { border-radius: var(--ns-login-radius-sheet) var(--ns-login-radius-sheet) 0 0; }
  .ns-login-sheet { border-radius: var(--ns-login-radius-sheet); }
}
@media (prefers-reduced-motion: no-preference) {
  .ns-login-tabs .nav-link { transition: color var(--ns-duration-base) var(--ns-easing), box-shadow var(--ns-duration-base) var(--ns-easing); }
}
@media (prefers-reduced-motion: reduce) {
  .ns-login-tabs .nav-link { transition: none; }
}
</style>
