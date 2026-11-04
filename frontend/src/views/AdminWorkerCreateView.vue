<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import AppCard from '../components/AppCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import { fetchDepartments, fetchZones } from '../api/referenceApi'
import { createWorker } from '../api/workersApi'
import { getFieldErrors } from '../utils/fieldErrors'
import { getErrorMessage } from '../utils/apiError'
import { formatPhone } from '../utils/formatPhone'

const form = reactive({
  name: '',
  phone: '',
  department_id: '',
  zone_id: '',
  pin: '',
  confirmPin: '',
})

const fieldErrors = reactive({
  name: '',
  phone: '',
  department_id: '',
  zone_id: '',
  pin: '',
  confirmPin: '',
})

const submitError = ref('')
const isSubmitting = ref(false)
const createdWorker = ref(null)

const departments = ref([])
const zones = ref([])
const isLoadingOptions = ref(true)
const optionsError = ref('')

let requestId = 0
let isMounted = false

const sortedDepartments = computed(() => {
  return [...departments.value].sort((a, b) => a.name.localeCompare(b.name))
})

function onPinInput(event) {
  form.pin = event.target.value.replace(/\D/g, '').slice(0, 4)
}

function onConfirmPinInput(event) {
  form.confirmPin = event.target.value.replace(/\D/g, '').slice(0, 4)
}

function clearFieldErrors() {
  fieldErrors.name = ''
  fieldErrors.phone = ''
  fieldErrors.department_id = ''
  fieldErrors.zone_id = ''
  fieldErrors.pin = ''
  fieldErrors.confirmPin = ''
  submitError.value = ''
}

function validateClient() {
  clearFieldErrors()
  let isValid = true

  const trimmedName = form.name.trim()
  if (trimmedName.length < 2) {
    fieldErrors.name = "Enter the worker's full name."
    isValid = false
  }

  const sanitizedPhone = form.phone.replace(/\s+/g, '')
  if (!/^\+?\d{10,15}$/.test(sanitizedPhone)) {
    fieldErrors.phone = 'Enter a valid phone number.'
    isValid = false
  }

  if (!form.department_id) {
    fieldErrors.department_id = 'Choose a department.'
    isValid = false
  }

  if (!form.zone_id) {
    fieldErrors.zone_id = 'Choose a zone.'
    isValid = false
  }

  if (!/^\d{4}$/.test(form.pin)) {
    fieldErrors.pin = 'PIN must be exactly 4 digits.'
    isValid = false
  }

  if (!form.confirmPin || form.confirmPin !== form.pin) {
    fieldErrors.confirmPin = 'PINs do not match.'
    isValid = false
  }

  return isValid
}

async function loadOptions() {
  const currentRequestId = ++requestId
  isLoadingOptions.value = true
  optionsError.value = ''

  try {
    const [depts, zns] = await Promise.all([fetchDepartments(), fetchZones()])
    if (!isMounted || currentRequestId !== requestId) return

    departments.value = depts
    zones.value = zns
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return
    optionsError.value = getErrorMessage(err)
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoadingOptions.value = false
    }
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return

  const isValid = validateClient()
  if (!isValid) return

  const submitPayload = {
    name: form.name,
    phone: form.phone,
    pin: form.pin,
    department_id: form.department_id,
    zone_id: form.zone_id,
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    const worker = await createWorker(submitPayload)
    if (!isMounted) return

    createdWorker.value = worker
  } catch (err) {
    if (!isMounted) return

    if (err?.response?.status === 409) {
      fieldErrors.phone = 'A worker with this phone number already exists.'
    } else {
      const serverFieldErrors = getFieldErrors(err)
      let hasMappedFieldError = false

      if (serverFieldErrors.name) {
        fieldErrors.name = serverFieldErrors.name
        hasMappedFieldError = true
      }
      if (serverFieldErrors.phone) {
        fieldErrors.phone = serverFieldErrors.phone
        hasMappedFieldError = true
      }
      if (serverFieldErrors.pin) {
        fieldErrors.pin = serverFieldErrors.pin
        hasMappedFieldError = true
      }
      if (serverFieldErrors.department_id) {
        fieldErrors.department_id = serverFieldErrors.department_id
        hasMappedFieldError = true
      }
      if (serverFieldErrors.zone_id) {
        fieldErrors.zone_id = serverFieldErrors.zone_id
        hasMappedFieldError = true
      }

      if (!hasMappedFieldError) {
        submitError.value = getErrorMessage(err)
      }
    }
  } finally {
    form.pin = ''
    form.confirmPin = ''
    if (isMounted) {
      isSubmitting.value = false
    }
  }
}

function handleAddAnother() {
  createdWorker.value = null
  form.name = ''
  form.phone = ''
  form.department_id = ''
  form.zone_id = ''
  form.pin = ''
  form.confirmPin = ''
  clearFieldErrors()
}

onMounted(() => {
  isMounted = true
  loadOptions()
})

onBeforeUnmount(() => {
  isMounted = false
})

defineExpose({
  form,
  fieldErrors,
  handleSubmit,
  loadOptions,
  createdWorker,
  handleAddAnother,
})
</script>

<template>
  <div class="admin-worker-create-view">
    <PageHeader
      title="Add worker"
      subtitle="Create a field worker account. They sign in with their phone number and PIN."
    >
      <template #actions>
        <RouterLink :to="{ name: 'admin-workers' }" class="btn btn-outline-secondary btn-sm">
          Back to workers
        </RouterLink>
      </template>
    </PageHeader>

    <LoadingSpinner v-if="isLoadingOptions" centered label="Loading form..." />

    <ErrorAlert
      v-else-if="optionsError"
      class="mb-4"
      title="Could not load form data"
      :message="optionsError"
      show-retry
      @retry="loadOptions"
    />

    <template v-else>
      <AppCard v-if="createdWorker" class="worker-create-card">
        <div class="worker-success">
          <h2 class="h4 mb-3">Worker added</h2>
          <div class="worker-summary mb-3">
            <div class="worker-summary__item">
              <span class="worker-summary__label">Name:</span>
              <span class="worker-summary__value fw-semibold">{{ createdWorker.name }}</span>
            </div>
            <div class="worker-summary__item">
              <span class="worker-summary__label">Department:</span>
              <span class="worker-summary__value">{{ createdWorker.department }}</span>
            </div>
            <div class="worker-summary__item">
              <span class="worker-summary__label">Zone:</span>
              <span class="worker-summary__value">{{ createdWorker.zone }}</span>
            </div>
            <div class="worker-summary__item">
              <span class="worker-summary__label">Phone:</span>
              <span class="worker-summary__value">{{ formatPhone(createdWorker.phone) }}</span>
            </div>
          </div>
          <p class="text-secondary mb-4">
            They can now sign in with their phone number and the PIN you set.
          </p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" class="btn btn-primary" @click="handleAddAnother">
              Add another worker
            </button>
            <RouterLink :to="{ name: 'admin-workers' }" class="btn btn-outline-secondary">
              Back to workers
            </RouterLink>
          </div>
        </div>
      </AppCard>

      <AppCard v-else class="worker-create-card">
        <ErrorAlert
          v-if="submitError"
          class="mb-4"
          title="Could not create worker"
          :message="submitError"
        />

        <form novalidate @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label for="worker-name" class="form-label">Full name</label>
            <input
              id="worker-name"
              v-model="form.name"
              type="text"
              class="form-control"
              autocomplete="off"
              :class="{ 'is-invalid': !!fieldErrors.name }"
            />
            <div v-if="fieldErrors.name" class="invalid-feedback">{{ fieldErrors.name }}</div>
          </div>

          <div class="mb-3">
            <label for="worker-phone" class="form-label">Phone number</label>
            <input
              id="worker-phone"
              v-model="form.phone"
              type="tel"
              inputmode="tel"
              class="form-control"
              autocomplete="off"
              :class="{ 'is-invalid': !!fieldErrors.phone }"
            />
            <div class="form-text">10-digit mobile number, or with +91</div>
            <div v-if="fieldErrors.phone" class="invalid-feedback">{{ fieldErrors.phone }}</div>
          </div>

          <div class="mb-3">
            <label for="worker-department" class="form-label">Department</label>
            <select
              id="worker-department"
              v-model="form.department_id"
              class="form-select"
              :class="{ 'is-invalid': !!fieldErrors.department_id }"
            >
              <option value="">Select department</option>
              <option v-for="dept in sortedDepartments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
            <div v-if="fieldErrors.department_id" class="invalid-feedback">
              {{ fieldErrors.department_id }}
            </div>
          </div>

          <div class="mb-3">
            <label for="worker-zone" class="form-label">Zone</label>
            <select
              id="worker-zone"
              v-model="form.zone_id"
              class="form-select"
              :class="{ 'is-invalid': !!fieldErrors.zone_id }"
            >
              <option value="">Select zone</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">
                {{ z.name }}
              </option>
            </select>
            <div v-if="fieldErrors.zone_id" class="invalid-feedback">
              {{ fieldErrors.zone_id }}
            </div>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-12 col-sm-6">
              <label for="worker-pin" class="form-label">PIN</label>
              <input
                id="worker-pin"
                :value="form.pin"
                type="password"
                inputmode="numeric"
                maxlength="4"
                class="form-control"
                autocomplete="new-password"
                :class="{ 'is-invalid': !!fieldErrors.pin }"
                @input="onPinInput"
              />
              <div class="form-text">4 digits. The worker uses it to sign in.</div>
              <div v-if="fieldErrors.pin" class="invalid-feedback">{{ fieldErrors.pin }}</div>
            </div>

            <div class="col-12 col-sm-6">
              <label for="worker-confirm-pin" class="form-label">Confirm PIN</label>
              <input
                id="worker-confirm-pin"
                :value="form.confirmPin"
                type="password"
                inputmode="numeric"
                maxlength="4"
                class="form-control"
                autocomplete="new-password"
                :class="{ 'is-invalid': !!fieldErrors.confirmPin }"
                @input="onConfirmPinInput"
              />
              <div v-if="fieldErrors.confirmPin" class="invalid-feedback">
                {{ fieldErrors.confirmPin }}
              </div>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button
              type="submit"
              class="btn btn-primary d-inline-flex align-items-center gap-2"
              :disabled="isSubmitting"
            >
              <LoadingSpinner v-if="isSubmitting" size="sm" label="Creating..." />
              <span>Create worker</span>
            </button>
            <RouterLink :to="{ name: 'admin-workers' }" class="btn btn-outline-secondary">
              Cancel
            </RouterLink>
          </div>
        </form>
      </AppCard>
    </template>
  </div>
</template>

<style scoped>
.worker-create-card {
  max-width: 640px;
}

.worker-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--ns-surface-2);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-control);
}

.worker-summary__item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.worker-summary__label {
  color: var(--ns-slate);
  font-size: 0.875rem;
  min-width: 90px;
}

.worker-summary__value {
  color: var(--ns-ink);
}
</style>

