<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getErrorMessage } from '../utils/apiError'
import LoadingSpinner from './LoadingSpinner.vue'
import ErrorAlert from './ErrorAlert.vue'

const emit = defineEmits(['success'])
const auth = useAuthStore()

const phone = ref('')
const pin = ref('')
const errors = reactive({
  phone: '',
  pin: '',
})
const isLoading = ref(false)
const errorMessage = ref('')

function onPinInput(event) {
  const digitsOnly = event.target.value.replace(/\D/g, '')
  pin.value = digitsOnly
  event.target.value = digitsOnly
}

async function handleSubmit() {
  if (isLoading.value) return

  errorMessage.value = ''
  errors.phone = ''
  errors.pin = ''

  const cleanedPhone = phone.value.replace(/\s+/g, '')

  if (!/^\+?\d{10,15}$/.test(cleanedPhone)) {
    errors.phone = 'Enter a valid phone number.'
  }
  if (!/^\d{4}$/.test(pin.value)) {
    errors.pin = 'PIN must be exactly 4 digits.'
  }

  if (errors.phone || errors.pin) {
    return
  }

  isLoading.value = true
  try {
    await auth.loginWorker({ phone: cleanedPhone, pin: pin.value })
    emit('success')
  } catch (error) {
    if (error?.response?.status === 401) {
      errorMessage.value = 'Incorrect phone number or PIN.'
    } else if (error?.response?.status === 403) {
      errorMessage.value =
        'This account is not allowed to log in. Please contact your administrator.'
    } else {
      errorMessage.value = getErrorMessage(error)
    }
    pin.value = ''
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
        <label for="worker-phone" class="form-label">Phone number</label>
        <input
          id="worker-phone"
          v-model="phone"
          type="tel"
          inputmode="tel"
          class="form-control"
          :class="{ 'is-invalid': errors.phone }"
          autocomplete="tel"
        />
        <div v-if="errors.phone" class="invalid-feedback">{{ errors.phone }}</div>
      </div>

      <div class="mb-3">
        <label for="worker-pin" class="form-label">PIN</label>
        <input
          id="worker-pin"
          :value="pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          class="form-control"
          :class="{ 'is-invalid': errors.pin }"
          autocomplete="current-password"
          @input="onPinInput"
        />
        <div v-if="errors.pin" class="invalid-feedback">{{ errors.pin }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
        <LoadingSpinner v-if="isLoading" size="sm" label="Signing in..." class="me-2" />
        Sign in
      </button>
    </form>
  </div>
</template>
