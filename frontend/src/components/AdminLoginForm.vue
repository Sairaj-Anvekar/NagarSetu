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
  <div>
    <ErrorAlert v-if="errorMessage" title="Login failed" :message="errorMessage" class="mb-3" />
    <form novalidate @submit.prevent="handleSubmit">
      <div class="mb-3">
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

      <div class="mb-3">
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

      <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
        <LoadingSpinner v-if="isLoading" size="sm" label="Signing in..." class="me-2" />
        Sign in
      </button>
    </form>
  </div>
</template>
