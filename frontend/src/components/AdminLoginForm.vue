<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getErrorMessage } from '../utils/apiError'
import LoadingSpinner from './LoadingSpinner.vue'
import ErrorAlert from './ErrorAlert.vue'

const emit = defineEmits(['success'])
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errors = reactive({
  username: '',
  password: '',
})
const isLoading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  if (isLoading.value) return

  errorMessage.value = ''
  errors.username = ''
  errors.password = ''

  const trimmedUsername = username.value.trim()

  if (!trimmedUsername) {
    errors.username = 'Username is required.'
  }
  if (!password.value) {
    errors.password = 'Password is required.'
  }

  if (errors.username || errors.password) {
    return
  }

  isLoading.value = true
  try {
    await auth.loginAdmin({ username: trimmedUsername, password: password.value })
    emit('success')
  } catch (error) {
    if (error?.response?.status === 401) {
      errorMessage.value = 'Incorrect username or password.'
    } else if (error?.response?.status === 403) {
      errorMessage.value =
        'This account is not allowed to log in. Please contact your administrator.'
    } else {
      errorMessage.value = getErrorMessage(error)
    }
    password.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <ErrorAlert v-if="errorMessage" title="Login failed" :message="errorMessage" class="admin-login-alert" />
    <form novalidate @submit.prevent="handleSubmit">
      <div class="admin-login-field">
        <label for="admin-username" class="form-label">Username</label>
        <input
          id="admin-username"
          v-model="username"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': errors.username }"
          autocomplete="username"
        />
        <div v-if="errors.username" class="invalid-feedback">{{ errors.username }}</div>
      </div>

      <div class="admin-login-field">
        <label for="admin-password" class="form-label">Password</label>
        <div class="admin-login-password">
        <input
          id="admin-password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          class="form-control"
          :class="{ 'is-invalid': errors.password }"
          autocomplete="current-password"
        />
          <button
            type="button"
            class="admin-login-password-toggle"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div v-if="errors.password" class="invalid-feedback">{{ errors.password }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100 admin-login-submit" :disabled="isLoading">
        <LoadingSpinner v-if="isLoading" size="sm" label="Signing in..." class="me-2" />
        Sign in
        <svg class="admin-login-submit-arrow" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
          <path d="M4 12h16m-6-6 6 6-6 6" />
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
.admin-login form { display: flex; flex-direction: column; gap: 16px; }
.admin-login .form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--ns-login-navy);
  font-size: 13px;
  font-weight: 600;
}
.admin-login .form-control {
  height: 52px;
  min-width: 0;
  border: 1.5px solid var(--ns-login-field-border);
  border-radius: var(--ns-login-radius-field);
  background-color: var(--ns-paper);
  color: var(--ns-login-navy);
  font-size: 16px;
  font-weight: 500;
}
.admin-login .form-control:focus {
  border-color: var(--ns-login-teal);
  box-shadow: var(--ns-login-focus-shadow);
}
.admin-login .form-control.is-invalid { border-color: var(--ns-danger-fg); }
.admin-login .invalid-feedback { display: block; font-size: 12px; }
.admin-login-password-toggle, .admin-login-submit-arrow { display: none; }
.admin-login-submit {
  min-height: 54px;
  border: 0;
  border-radius: var(--ns-login-radius-field);
  background: var(--ns-login-gradient);
  color: var(--ns-paper);
  font-size: 16px;
  font-weight: 600;
  box-shadow: var(--ns-login-button-shadow);
}
.admin-login-submit:disabled { color: var(--ns-paper); opacity: 0.7; }
.admin-login-submit:focus-visible { outline: 2px solid var(--ns-login-teal); outline-offset: 2px; }
.admin-login-alert { margin-bottom: 8px; padding: 8px 12px; font-size: 13px; }
.admin-login-alert :deep(.alert-heading) { font-size: 14px; margin-bottom: 4px; }
@media (max-height: 700px) {
  .admin-login form { gap: 10px; }
}
@media (min-width: 992px) {
  .admin-login .form-control, .admin-login-submit { border-radius: var(--ns-radius-md); }
  .admin-login-password { position: relative; }
  .admin-login-password .form-control { padding-right: 76px; }
  .admin-login-password .form-control.is-invalid { background-image: none; }
  .admin-login-password-toggle {
    display: block;
    position: absolute;
    right: 4px;
    top: 4px;
    min-width: 60px;
    min-height: 44px;
    border: 0;
    border-radius: var(--ns-radius-sm);
    background: transparent;
    color: var(--ns-login-control-text);
    font-size: 14px;
    font-weight: 600;
  }
  .admin-login-password-toggle:focus-visible {
    outline: 2px solid var(--ns-login-teal);
    outline-offset: -2px;
  }
  .admin-login-submit { box-shadow: 0 10px 22px rgba(11, 114, 133, 0.3); }
  .admin-login-submit-arrow { display: inline-block; margin-left: 8px; vertical-align: middle; }
}
@media (prefers-reduced-motion: no-preference) {
  .admin-login .form-control, .admin-login-submit {
    transition: border-color var(--ns-duration-base) var(--ns-easing), box-shadow var(--ns-duration-base) var(--ns-easing);
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-login .form-control, .admin-login-submit { transition: none; }
}
</style>
