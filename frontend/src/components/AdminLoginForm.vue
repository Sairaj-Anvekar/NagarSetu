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
        <input
          id="admin-password"
          v-model="password"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': errors.password }"
          autocomplete="current-password"
        />
        <div v-if="errors.password" class="invalid-feedback">{{ errors.password }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100 admin-login-submit" :disabled="isLoading">
        <LoadingSpinner v-if="isLoading" size="sm" label="Signing in..." class="me-2" />
        Sign in
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
.admin-login .invalid-feedback { font-size: 12px; }
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
@media (prefers-reduced-motion: no-preference) {
  .admin-login .form-control, .admin-login-submit {
    transition: border-color var(--ns-duration-base) var(--ns-easing), box-shadow var(--ns-duration-base) var(--ns-easing);
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-login .form-control, .admin-login-submit { transition: none; }
}
</style>
