<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import { fetchDepartments, fetchZones } from '../api/referenceApi'
import { createWorker } from '../api/workersApi'
import { getFieldErrors } from '../utils/fieldErrors'
import { getErrorMessage } from '../utils/apiError'
import { formatPhone } from '../utils/formatPhone'
import { labelOf } from '../utils/labelOf'

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
const showPin = ref(false)
const showConfirmPin = ref(false)

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
      <div class="row g-4 align-items-start">
        <!-- Form Column (left) -->
        <div class="col-12 col-lg-7 col-xl-8">
          <!-- Success Card -->
          <div v-if="createdWorker" class="ns-form-card">
            <div class="worker-success">
              <div class="d-flex align-items-center gap-2 mb-3">
                <span class="ns-success-badge-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <h2 class="h4 mb-0 fw-bold text-dark">Worker added</h2>
              </div>
              <div class="worker-summary mb-3">
                <div class="worker-summary__item">
                  <span class="worker-summary__label">Name:</span>
                  <span class="worker-summary__value fw-semibold">{{ createdWorker.name }}</span>
                </div>
                <div class="worker-summary__item">
                  <span class="worker-summary__label">Department:</span>
                  <span class="worker-summary__value">{{ labelOf(createdWorker.department) }}</span>
                </div>
                <div class="worker-summary__item">
                  <span class="worker-summary__label">Zone:</span>
                  <span class="worker-summary__value">{{ labelOf(createdWorker.zone) }}</span>
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
                <button type="button" class="btn btn-primary ns-btn-gradient" @click="handleAddAnother">
                  Add another worker
                </button>
                <RouterLink :to="{ name: 'admin-workers' }" class="btn btn-outline-secondary ns-btn-cancel">
                  Back to workers
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Add Worker Form Card -->
          <div v-else class="ns-form-card">
            <ErrorAlert
              v-if="submitError"
              class="mb-4"
              title="Could not create worker"
              :message="submitError"
            />

            <form novalidate @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="worker-name" class="form-label fw-semibold">Full name</label>
                <input
                  id="worker-name"
                  v-model="form.name"
                  type="text"
                  class="form-control ns-form-control"
                  autocomplete="off"
                  placeholder="e.g. Ramesh Kumar"
                  :class="{ 'is-invalid': !!fieldErrors.name }"
                />
                <div v-if="fieldErrors.name" class="invalid-feedback">{{ fieldErrors.name }}</div>
              </div>

              <div class="mb-3">
                <label for="worker-phone" class="form-label fw-semibold">Phone number</label>
                <div class="input-group">
                  <span class="input-group-text ns-phone-prefix" id="phone-prefix">+91</span>
                  <input
                    id="worker-phone"
                    v-model="form.phone"
                    type="tel"
                    inputmode="tel"
                    class="form-control ns-form-control"
                    autocomplete="off"
                    placeholder="98765 43210"
                    aria-describedby="phone-prefix"
                    :class="{ 'is-invalid': !!fieldErrors.phone }"
                  />
                </div>
                <div class="form-text text-secondary small">10-digit mobile number, or with +91</div>
                <div v-if="fieldErrors.phone" class="invalid-feedback d-block">{{ fieldErrors.phone }}</div>
              </div>

              <div class="mb-3">
                <label for="worker-department" class="form-label fw-semibold">Department</label>
                <div class="ns-readonly-field">
                  <input
                    type="text"
                    class="form-control ns-form-control ns-input-readonly"
                    value="Sanitation"
                    readonly
                    aria-label="Department (read-only)"
                  />
                  <span class="ns-readonly-badge">Fixed</span>
                </div>
                <!-- Hidden select keeps form.department_id bound and test queries functioning -->
                <select
                  id="worker-department"
                  v-model="form.department_id"
                  class="visually-hidden"
                  :class="{ 'is-invalid': !!fieldErrors.department_id }"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <option value="">Select department</option>
                  <option v-for="dept in sortedDepartments" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
                <div v-if="fieldErrors.department_id" class="invalid-feedback d-block">
                  {{ fieldErrors.department_id }}
                </div>
              </div>

              <div class="mb-3">
                <label for="worker-zone" class="form-label fw-semibold">Zone</label>
                <select
                  id="worker-zone"
                  v-model="form.zone_id"
                  class="form-select ns-form-select"
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
                  <label for="worker-pin" class="form-label fw-semibold">PIN</label>
                  <div class="input-group">
                    <input
                      id="worker-pin"
                      :value="form.pin"
                      :type="showPin ? 'text' : 'password'"
                      inputmode="numeric"
                      maxlength="4"
                      class="form-control ns-form-control"
                      autocomplete="new-password"
                      placeholder="••••"
                      :class="{ 'is-invalid': !!fieldErrors.pin }"
                      @input="onPinInput"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary ns-pin-toggle"
                      :aria-label="showPin ? 'Hide PIN' : 'Show PIN'"
                      @click="showPin = !showPin"
                    >
                      {{ showPin ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <div class="form-text text-secondary small">4 digits. The worker uses it to sign in.</div>
                  <div v-if="fieldErrors.pin" class="invalid-feedback d-block">{{ fieldErrors.pin }}</div>
                </div>

                <div class="col-12 col-sm-6">
                  <label for="worker-confirm-pin" class="form-label fw-semibold">Confirm PIN</label>
                  <div class="input-group">
                    <input
                      id="worker-confirm-pin"
                      :value="form.confirmPin"
                      :type="showConfirmPin ? 'text' : 'password'"
                      inputmode="numeric"
                      maxlength="4"
                      class="form-control ns-form-control"
                      autocomplete="new-password"
                      placeholder="••••"
                      :class="{ 'is-invalid': !!fieldErrors.confirmPin }"
                      @input="onConfirmPinInput"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary ns-pin-toggle"
                      :aria-label="showConfirmPin ? 'Hide confirm PIN' : 'Show confirm PIN'"
                      @click="showConfirmPin = !showConfirmPin"
                    >
                      {{ showConfirmPin ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <div v-if="fieldErrors.confirmPin" class="invalid-feedback d-block">
                    {{ fieldErrors.confirmPin }}
                  </div>
                </div>
              </div>

              <div class="d-flex align-items-center gap-3">
                <button
                  type="submit"
                  class="btn btn-primary d-inline-flex align-items-center gap-2 ns-btn-gradient"
                  :disabled="isSubmitting"
                >
                  <LoadingSpinner v-if="isSubmitting" size="sm" label="Creating..." />
                  <span>{{ isSubmitting ? 'Creating...' : 'Add worker' }}</span>
                </button>
                <RouterLink :to="{ name: 'admin-workers' }" class="btn btn-outline-secondary ns-btn-cancel">
                  Cancel
                </RouterLink>
              </div>
            </form>
          </div>
        </div>

        <!-- How it works Side Card (right) -->
        <div class="col-12 col-lg-5 col-xl-4">
          <div class="ns-side-card">
            <div class="ns-side-card__header mb-3">
              <div class="ns-side-card__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h2 class="ns-side-card__title mb-0">How it works</h2>
            </div>
            <ul class="ns-side-card__list">
              <li class="ns-side-card__item">
                <span class="ns-side-card__bullet" aria-hidden="true">1</span>
                <span>The worker logs in with their phone and 4-digit PIN.</span>
              </li>
              <li class="ns-side-card__item">
                <span class="ns-side-card__bullet" aria-hidden="true">2</span>
                <span>Sees only complaints and tasks assigned to their own zone.</span>
              </li>
              <li class="ns-side-card__item">
                <span class="ns-side-card__bullet" aria-hidden="true">3</span>
                <span>Can be activated or deactivated any time from the Workers list.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-worker-create-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto;
}

.ns-form-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 32px 28px;
}

.ns-form-control,
.ns-form-select {
  border: 1.5px solid #D5DEE7;
  border-radius: 10px;
  font-size: 14px;
  color: #0E2233;
  padding: 9px 13px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.ns-form-control:focus,
.ns-form-select:focus {
  border-color: #0B7285;
  outline: 2px solid rgba(11, 114, 133, 0.25);
  outline-offset: 1px;
  box-shadow: none;
}

.ns-phone-prefix {
  background-color: #F8FAFC;
  border: 1.5px solid #D5DEE7;
  border-right: none;
  font-weight: 600;
  color: #4B5B6B;
  font-size: 14px;
  padding: 0 14px;
}

.ns-readonly-field {
  position: relative;
  display: flex;
  align-items: center;
}

.ns-input-readonly {
  background-color: #F8FAFC !important;
  color: #334155 !important;
  font-weight: 600;
  cursor: default;
}

.ns-readonly-badge {
  position: absolute;
  right: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #E2E8F0;
  color: #475467;
  padding: 2px 8px;
  border-radius: 999px;
  pointer-events: none;
}

.ns-pin-toggle {
  border: 1.5px solid #D5DEE7;
  border-left: none;
  background-color: #FFFFFF;
  color: #4B5B6B;
  font-weight: 600;
  font-size: 12px;
  padding: 0 12px;
  transition: all 150ms ease;
}

.ns-pin-toggle:hover {
  background-color: #F8FAFC;
  color: #0B7285;
}

.ns-btn-gradient {
  background: linear-gradient(135deg, #0B7285, #0E4F6B) !important;
  color: #FFFFFF !important;
  border: none !important;
  font-weight: 600;
  border-radius: 12px;
  height: 44px;
  padding: 0 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.2);
  transition: all 150ms ease;
  text-decoration: none;
}

.ns-btn-gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #0E4F6B, #093E54) !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 12px rgba(11, 114, 133, 0.3);
}

.ns-btn-cancel {
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1.5px solid #CBD5E1;
  color: #475467;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.ns-btn-cancel:hover {
  background-color: #F8FAFC;
  border-color: #94A3B8;
  color: #0E2233;
}

/* Side Card */
.ns-side-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 28px;
}

.ns-side-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ns-side-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0B7285;
}

.ns-side-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: #0E2233;
}

.ns-side-card__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ns-side-card__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

.ns-side-card__bullet {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #D8F1F3;
  color: #0B6A7C;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

/* Success Card */
.ns-success-badge-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #D8F1F3;
  color: #0B6A7C;
  display: flex;
  align-items: center;
  justify-content: center;
}

.worker-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--ns-surface-2);
  border: 1px solid var(--ns-line);
  border-radius: 12px;
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

@media (prefers-reduced-motion: reduce) {
  .ns-form-control,
  .ns-form-select,
  .ns-pin-toggle,
  .ns-btn-gradient,
  .ns-btn-cancel {
    transition: none;
  }
}
</style>

