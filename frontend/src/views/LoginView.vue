<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getSafeRedirect } from '../utils/redirect'
import { getInitialLoginRole } from '../utils/initialLoginRole'
import { getLastRole } from '../utils/authStorage'
import AdminLoginForm from '../components/AdminLoginForm.vue'
import WorkerLoginForm from '../components/WorkerLoginForm.vue'
import CivicHallIllustration from '../components/auth/CivicHallIllustration.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isStandalone =
  typeof window !== 'undefined'
    ? (window.matchMedia?.('(display-mode: standalone)')?.matches ?? false)
    : false

const activeTab = ref(
  getInitialLoginRole({
    queryRole: route.query.role,
    redirectPath: route.query.redirect,
    rememberedRole: getLastRole(),
    isStandalone,
  }),
)

watch(
  () => route.query.role,
  (newRole) => {
    if (newRole === 'worker' || newRole === 'admin') {
      activeTab.value = newRole
    }
  },
)

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
  <main class="ns-login" :class="{ 'ns-login--admin': activeTab === 'admin' }">
    <div class="ns-login-frame">
      <section v-if="activeTab === 'admin'" class="ns-admin-portal" aria-labelledby="admin-portal-heading">
        <div class="ns-admin-portal__brand">
          <span class="ns-admin-portal__seal" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">
              <path d="M4 12 16 5l12 7H4ZM6 15h20M8 15v10m8-10v10m8-10v10M5 26h22M3 29h26" />
            </svg>
          </span>
          <div>
            <p class="ns-admin-portal__brand-name">NagarSetu</p>
            <p class="ns-admin-portal__brand-subtitle">Municipal Grievance Redressal System</p>
          </div>
        </div>
        <div class="ns-admin-portal__copy">
          <p class="ns-admin-portal__eyebrow">MUNICIPAL ADMINISTRATION PORTAL</p>
          <h1 id="admin-portal-heading">Serving every ward. Resolving every grievance.</h1>
          <p class="ns-admin-portal__description">
            The official console for municipal officers to review citizen complaints, assign field
            workers and monitor resolution across all zones.
          </p>
          <ul class="ns-admin-portal__departments">
            <li>Sanitation</li>
            <li>Water Supply</li>
            <li>Roads</li>
            <li>Drainage</li>
            <li>Electrical</li>
          </ul>
        </div>
        <CivicHallIllustration />
      </section>
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
        <div v-if="activeTab === 'admin'" class="ns-admin-signin-heading">
          <span class="ns-admin-signin-tag">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" aria-hidden="true" focusable="false">
              <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            Official sign in
          </span>
          <h2>Officer login</h2>
          <p>Use the credentials issued by your municipal administrator.</p>
        </div>
          <div
            v-if="route.query.reason === 'deactivated'"
            class="alert alert-warning ns-login-notice"
            role="alert"
          >
            Your account has been deactivated. Please contact your administrator.
          </div>
          <div
            v-else-if="route.query.reason === 'expired'"
            class="alert alert-warning ns-login-notice"
            role="alert"
          >
            Your session has expired. Please log in again.
          </div>

            <div
              v-show="activeTab !== 'worker'"
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
        <div v-if="activeTab === 'admin'" class="ns-admin-access-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8" aria-hidden="true" focusable="false">
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
          </svg>
          <span>For authorised municipal staff only. Sign-ins are recorded for audit.</span>
        </div>
        <div v-if="activeTab === 'admin'" class="ns-admin-worker-switch">
          <button type="button" @click="activeTab = 'worker'">
            Field worker? Sign in on your phone
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" aria-hidden="true" focusable="false">
              <path d="M4 12h16m-6-6 6 6-6 6" />
            </svg>
          </button>
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
.ns-admin-portal { display: none; }
.ns-admin-signin-heading, .ns-admin-access-notice, .ns-admin-worker-switch { display: none; }
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
@media (min-width: 992px) {
  .ns-login--admin { display: block; padding: 0; }
  .ns-login--admin .ns-login-frame {
    display: grid;
    grid-template-columns: minmax(0, 55fr) minmax(0, 45fr);
    max-width: none;
    min-height: 100dvh;
    border-radius: 0;
  }
  .ns-login--admin .ns-login-intro { display: none; }
  .ns-admin-portal {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background-color: var(--ns-login-navy);
    background-image: radial-gradient(circle at 88% 6%, rgba(45, 212, 191, 0.3), transparent 46%),
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: auto, 32px 32px, 32px 32px;
    color: var(--ns-paper);
  }
  .ns-admin-portal__brand {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 40px clamp(28px, 4vw, 64px) 0;
  }
  .ns-admin-portal__seal {
    display: grid;
    place-items: center;
    flex: 0 0 56px;
    height: 56px;
    border: 2px solid rgba(126, 232, 217, 0.7);
    border-radius: var(--ns-radius-pill);
    background: rgba(255, 255, 255, 0.05);
    color: var(--ns-login-pill-text);
  }
  .ns-admin-portal__brand-name { margin: 0; font: 700 24px var(--ns-font-display); }
  .ns-admin-portal__brand-subtitle {
    margin: 4px 0 0;
    color: var(--ns-worker-header-muted);
    font-size: 13px;
    font-weight: 600;
  }
  .ns-admin-portal__copy { margin-block: auto; padding: 48px clamp(28px, 4vw, 64px) 24px; }
  .ns-admin-portal__eyebrow {
    margin: 0 0 20px;
    color: var(--ns-login-pill-text);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }
  #admin-portal-heading {
    max-width: 620px;
    margin: 0 0 24px;
    color: var(--ns-paper);
    font: 700 44px/1.14 var(--ns-font-display);
  }
  .ns-admin-portal__description {
    max-width: 560px;
    margin: 0 0 24px;
    color: #C9D8E3;
    font-size: 16px;
  }
  .ns-admin-portal__departments { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .ns-admin-portal__departments li {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--ns-radius-pill);
    background: rgba(255, 255, 255, 0.07);
    color: #DCE8F0;
    font-size: 13px;
    font-weight: 600;
  }
  .ns-admin-portal > .civic-hall { flex-shrink: 0; margin-top: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .ns-login-tabs .nav-link { transition: none; }
}
@media (min-width: 992px) {
  .ns-login--admin .ns-login-sheet {
    justify-content: center;
    align-items: center;
    gap: 20px;
    padding: 48px 32px;
    border-radius: 0;
    background: #F6F9FC;
    box-shadow: none;
  }
  .ns-login--admin .ns-login-sheet > * { width: 100%; max-width: 400px; }
  .ns-login--admin .ns-login-tabs { display: none; }
  .ns-login--admin .ns-admin-signin-heading { display: block; }
  .ns-admin-signin-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: var(--ns-radius-pill);
    background: var(--ns-worker-tab-pill-bg);
    color: var(--ns-login-control-text);
    font-size: 12px;
    font-weight: 700;
  }
  .ns-admin-signin-heading h2 {
    margin: 20px 0 12px;
    color: var(--ns-login-navy);
    font: 700 32px/1.2 var(--ns-font-display);
  }
  .ns-admin-signin-heading p {
    margin: 0;
    color: var(--ns-login-text-muted);
    font-size: 15px;
  }
  .ns-login--admin .ns-admin-access-notice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 14px;
    border-radius: var(--ns-radius-md);
    background: var(--ns-login-switch-bg);
    color: #3B4C5C;
    font-size: 13px;
  }
  .ns-admin-access-notice svg { flex-shrink: 0; margin-top: 2px; }
  .ns-login--admin .ns-admin-worker-switch {
    display: block;
    padding-top: 16px;
    border-top: 1px solid var(--ns-login-field-border);
  }
  .ns-admin-worker-switch button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: var(--ns-radius-md);
    background: transparent;
    color: var(--ns-login-control-text);
    font-size: 14px;
    font-weight: 600;
  }
  .ns-admin-worker-switch button svg { flex-shrink: 0; }
  .ns-admin-worker-switch button:focus-visible {
    outline: 2px solid var(--ns-login-teal);
    outline-offset: var(--ns-focus-ring-offset);
  }
  .ns-login--admin .ns-login-footer { margin-top: 0; }
  .ns-login--admin .ns-login-help { display: none; }
  .ns-login--admin .ns-login-connection { margin: 0; }
}
</style>
