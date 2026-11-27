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
const showPin = ref(false)
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
      const detail = error?.response?.data?.detail
      const isDeactivated =
        typeof detail === 'string' && detail.toLowerCase().includes('deactivated')
      if (isDeactivated) {
        errorMessage.value = 'This account is deactivated. Please contact your administrator.'
      } else {
        errorMessage.value =
          'This account is not allowed to log in. Please contact your administrator.'
      }
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
  <div class="worker-login">
    <ErrorAlert v-if="errorMessage" title="Login failed" :message="errorMessage" class="worker-login-alert" />
    <form novalidate @submit.prevent="handleSubmit">
      <div class="worker-login-field">
        <label for="worker-phone" class="form-label">Phone number</label>
        <div class="worker-login-input" :class="{ 'worker-login-input--invalid': errors.phone }">
          <span class="worker-login-prefix" aria-hidden="true">+91</span>
        <input
          id="worker-phone"
          v-model="phone"
          type="tel"
          inputmode="tel"
          class="form-control"
          :class="{ 'is-invalid': errors.phone }"
          autocomplete="tel"
          placeholder="10-digit number"
        />
        </div>
        <div v-if="errors.phone" class="invalid-feedback">{{ errors.phone }}</div>
      </div>

      <div class="worker-login-field">
        <label for="worker-pin" class="form-label">PIN</label>
        <div class="worker-login-input" :class="{ 'worker-login-input--invalid': errors.pin }">
        <input
          id="worker-pin"
          :value="pin"
          :type="showPin ? 'text' : 'password'"
          inputmode="numeric"
          maxlength="4"
          class="form-control"
          :class="{ 'is-invalid': errors.pin }"
          autocomplete="current-password"
          placeholder="Enter your PIN"
          @input="onPinInput"
        />
          <button
            type="button"
            class="worker-login-pin-toggle"
            :aria-label="showPin ? 'Hide PIN' : 'Show PIN'"
            @click="showPin = !showPin"
          >
            {{ showPin ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div v-if="errors.pin" class="invalid-feedback">{{ errors.pin }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100 worker-login-submit" :disabled="isLoading">
        <LoadingSpinner v-if="isLoading" size="sm" label="Signing in..." class="me-2" />
        Sign in
      </button>
    </form>
  </div>
</template>

<style scoped>
.worker-login form { display: flex; flex-direction: column; gap: 16px; }
.worker-login .form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--ns-login-navy);
  font-size: 13px;
  font-weight: 600;
}
.worker-login-input {
  display: flex;
  align-items: stretch;
  height: 52px;
  border: 1.5px solid var(--ns-login-field-border);
  border-radius: var(--ns-login-radius-field);
  overflow: hidden;
  background: var(--ns-paper);
}
.worker-login-prefix {
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-right: 1px solid var(--ns-login-field-border);
  background: var(--ns-login-field-bg);
  color: var(--ns-login-navy);
  font-size: 15px;
  font-weight: 600;
}
.worker-login .form-control {
  min-width: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  color: var(--ns-login-navy);
  font-size: 16px;
  font-weight: 500;
}
.worker-login .form-control::placeholder { color: var(--ns-login-text-secondary); opacity: 1; }
.worker-login-input:focus-within {
  border-color: var(--ns-login-teal);
  box-shadow: var(--ns-login-focus-shadow);
}
.worker-login-input--invalid { border-color: var(--ns-danger-fg); }
.worker-login-pin-toggle {
  flex: 0 0 60px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--ns-login-control-text);
  font-size: 14px;
  font-weight: 600;
}
.worker-login-pin-toggle:focus-visible {
  outline: 2px solid var(--ns-login-teal);
  outline-offset: -4px;
}
.worker-login .invalid-feedback { display: block; font-size: 12px; }
.worker-login-submit {
  min-height: 54px;
  border: 0;
  border-radius: var(--ns-login-radius-field);
  background: var(--ns-login-gradient);
  color: var(--ns-paper);
  font-size: 16px;
  font-weight: 600;
  box-shadow: var(--ns-login-button-shadow);
}
.worker-login-submit:disabled { color: var(--ns-paper); opacity: 0.7; }
.worker-login-submit:focus-visible { outline: 2px solid var(--ns-login-teal); outline-offset: 2px; }
.worker-login-alert { margin-bottom: 8px; padding: 8px 12px; font-size: 13px; }
.worker-login-alert :deep(.alert-heading) { font-size: 14px; margin-bottom: 4px; }
@media (max-height: 700px) {
  .worker-login form { gap: 10px; }
}
@media (prefers-reduced-motion: no-preference) {
  .worker-login-input, .worker-login-submit {
    transition: border-color var(--ns-duration-base) var(--ns-easing), box-shadow var(--ns-duration-base) var(--ns-easing);
  }
}
@media (prefers-reduced-motion: reduce) {
  .worker-login-input, .worker-login-submit, .worker-login .form-control { transition: none; }
}
</style>
