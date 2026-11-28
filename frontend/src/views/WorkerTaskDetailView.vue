<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getActivePinia } from 'pinia'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import TaskDetailHeader from '../components/worker/TaskDetailHeader.vue'
import TaskStatusStepper from '../components/worker/TaskStatusStepper.vue'
import WorkerCompleteForm from '../components/worker/WorkerCompleteForm.vue'
import { deferTask, fetchTask, startTask } from '../api/complaintsApi'
import { useAuthStore } from '../stores/auth'
import { getErrorMessage } from '../utils/apiError'
import { getFieldErrors } from '../utils/fieldErrors'
import { buildDirectionsUrl } from '../utils/googleMaps'
import { labelOf } from '../utils/labelOf'
import { DEFER_REASON_MAX, DEFER_REASON_MIN } from '../utils/resolutionLimits'

defineProps({
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const route = useRoute()
const auth = getActivePinia() ? useAuthStore() : null
const workerZone = computed(() => labelOf(auth?.user?.zone))

const task = ref(null)
const isLoading = ref(false)
const isNotFound = ref(false)
const loadError = ref('')
const imageError = ref(false)
const isStarting = ref(false)
const actionError = ref('')
const statusNotice = ref('')
const showDeferForm = ref(false)
const deferReason = ref('')
const reasonError = ref('')
const isDeferring = ref(false)
const isDeferred = ref(false)

let requestId = 0
let isMounted = false

const pageTitle = computed(() => task.value?.tracking_code || 'Task details')
const showPhoto = computed(() => Boolean(task.value?.image_url) && !imageError.value)
const directionsUrl = computed(() =>
  buildDirectionsUrl(task.value?.latitude, task.value?.longitude),
)
const canStart = computed(() => task.value?.status === 'Submitted')
const canDefer = computed(
  () => task.value?.status === 'Submitted' || task.value?.status === 'In-Progress',
)
const canComplete = computed(() => task.value?.status === 'In-Progress')
const isCompleted = computed(() => task.value?.status === 'Completed')
const trimmedReason = computed(() => deferReason.value.trim())
const trimmedReasonLength = computed(() => trimmedReason.value.length)
const isReasonTooLong = computed(() => trimmedReasonLength.value > DEFER_REASON_MAX)
const isReasonValid = computed(
  () =>
    trimmedReasonLength.value >= DEFER_REASON_MIN &&
    trimmedReasonLength.value <= DEFER_REASON_MAX,
)
const displayedReasonError = computed(() => {
  if (reasonError.value) return reasonError.value
  if (isReasonTooLong.value) {
    return `Reason must be ${DEFER_REASON_MAX} characters or fewer.`
  }
  return ''
})

watch(
  () => task.value?.image_url,
  () => {
    imageError.value = false
  },
)

watch(deferReason, () => {
  if (reasonError.value) {
    reasonError.value = ''
  }
})

async function loadTask({ preserveNotice = false } = {}) {
  const taskId = route.params.id
  const currentRequestId = ++requestId

  isLoading.value = true
  isNotFound.value = false
  isDeferred.value = false
  loadError.value = ''
  actionError.value = ''
  if (!preserveNotice) {
    statusNotice.value = ''
  }

  try {
    const data = await fetchTask(String(taskId ?? ''))
    if (!isMounted || currentRequestId !== requestId) return

    task.value = data
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return

    task.value = null
    if (err?.response?.status === 404) {
      isNotFound.value = true
    } else {
      loadError.value = getErrorMessage(err)
    }
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

async function handleStartWork() {
  if (!task.value || isStarting.value) return

  isStarting.value = true
  actionError.value = ''
  statusNotice.value = ''

  try {
    const updatedTask = await startTask(String(task.value.id))
    if (!isMounted) return

    task.value = updatedTask
  } catch (err) {
    if (!isMounted) return

    if (err?.response?.status === 409) {
      statusNotice.value = 'This task has already changed. Refreshing.'
      isStarting.value = false
      await loadTask({ preserveNotice: true })
      return
    }
    actionError.value = getErrorMessage(err)
  } finally {
    if (isMounted) {
      isStarting.value = false
    }
  }
}

function openDeferForm() {
  showDeferForm.value = true
  deferReason.value = ''
  reasonError.value = ''
  actionError.value = ''
}

function closeDeferForm() {
  showDeferForm.value = false
  reasonError.value = ''
}

function handleTaskCompleted(completedTask) {
  task.value = completedTask
  showDeferForm.value = false
  actionError.value = ''
  statusNotice.value = ''
}

function validateDeferReason() {
  const len = trimmedReasonLength.value
  if (len < DEFER_REASON_MIN) {
    reasonError.value = `Enter at least ${DEFER_REASON_MIN} characters.`
    return false
  }
  if (len > DEFER_REASON_MAX) {
    reasonError.value = `Reason must be ${DEFER_REASON_MAX} characters or fewer.`
    return false
  }
  reasonError.value = ''
  return true
}

async function handleDeferSubmit() {
  if (!task.value || isDeferring.value) return
  if (!validateDeferReason()) return

  isDeferring.value = true
  actionError.value = ''
  statusNotice.value = ''

  try {
    await deferTask(String(task.value.id), trimmedReason.value)
    if (!isMounted) return

    isDeferred.value = true
    showDeferForm.value = false
  } catch (err) {
    if (!isMounted) return

    if (err?.response?.status === 422) {
      const serverErrors = getFieldErrors(err)
      if (serverErrors.reason) {
        reasonError.value = serverErrors.reason
      } else {
        actionError.value = getErrorMessage(err)
      }
    } else if (err?.response?.status === 409) {
      actionError.value = getErrorMessage(err, 'This task can no longer be deferred.')
    } else {
      actionError.value = getErrorMessage(err)
    }
  } finally {
    if (isMounted) {
      isDeferring.value = false
    }
  }
}

onMounted(() => {
  isMounted = true
  loadTask()
})

watch(
  () => route.params.id,
  (nextId, prevId) => {
    if (isMounted && nextId && nextId !== prevId) {
      loadTask()
    }
  },
)

onBeforeUnmount(() => {
  isMounted = false
})
</script>

<template>
  <div class="worker-detail-page">
    <header
      v-if="!task && !isDeferred"
      class="worker-detail-fallback-header d-flex align-items-center gap-3 p-3"
    >
      <RouterLink
        to="/worker"
        class="btn btn-outline-secondary worker-detail-back d-inline-flex align-items-center justify-content-center"
        aria-label="Back to my tasks"
      >
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
      <h1 class="worker-detail-title mb-0">{{ pageTitle }}</h1>
    </header>

    <div v-if="statusNotice" class="alert alert-warning mb-0" role="status">
      {{ statusNotice }}
    </div>

    <LoadingSpinner v-if="isLoading" centered label="Loading task..." />

    <EmptyState
      v-else-if="isNotFound"
      title="This task is no longer available"
      message="It may have been completed or returned to the queue."
    >
      <RouterLink to="/worker" class="btn btn-primary worker-detail-action-btn">
        Back to my tasks
      </RouterLink>
    </EmptyState>

    <ErrorAlert
      v-else-if="loadError"
      title="Could not load task"
      :message="loadError"
      show-retry
      @retry="loadTask"
    />

    <section
      v-else-if="isDeferred"
      class="worker-detail-card worker-detail-deferred d-flex flex-column gap-3 m-3"
      role="status"
    >
      <p class="mb-0 fw-semibold">Task deferred. It has been returned to the queue.</p>
      <RouterLink to="/worker" class="btn btn-primary worker-detail-action-btn w-100">
        Back to my tasks
      </RouterLink>
    </section>

    <div v-else-if="task" class="worker-detail-content">
      <TaskDetailHeader
        :tracking-code="pageTitle"
        :category="task.category || ''"
        :priority="task.priority || 'low'"
        :zone="workerZone"
      />

      <div class="worker-detail-body">
        <TaskStatusStepper
          :status="task.status"
          :sla-deadline="task.sla_deadline"
          :now="now"
          class="worker-detail-status-card"
        />

        <section class="worker-detail-card" aria-labelledby="section-doing">
          <h2 id="section-doing" class="worker-detail-card-title">What needs doing</h2>
          <p class="worker-detail-description mb-0">{{ task.description }}</p>
        </section>

        <section class="worker-detail-card" aria-labelledby="section-location">
          <h2 id="section-location" class="worker-detail-card-title">Location</h2>
          <div class="worker-detail-location-pin-block" aria-hidden="true">
            <svg
              class="worker-detail-location-pin-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p v-if="workerZone" class="worker-detail-location-zone">{{ workerZone }}</p>
          <div class="worker-detail-directions">
            <a
              v-if="directionsUrl"
              :href="directionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline-primary worker-detail-action-btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
            >
              <AppIcon name="map-pin" :size="18" />
              <span>Get directions</span>
            </a>
            <div v-else class="d-flex flex-column gap-1">
              <button
                type="button"
                class="btn btn-outline-secondary worker-detail-action-btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
                disabled
              >
                <AppIcon name="map-pin" :size="18" />
                <span>Get directions</span>
              </button>
              <p class="worker-detail-directions-note mb-0">
                Location coordinates are unavailable for this task.
              </p>
            </div>
          </div>
        </section>

        <section class="worker-detail-card" aria-labelledby="section-photo">
          <h2 id="section-photo" class="worker-detail-card-title">Complaint photo</h2>
          <div class="worker-detail-photo-wrap">
            <img
              v-if="showPhoto"
              :src="task.image_url"
              :alt="`${task.category} complaint photo`"
              class="worker-detail-photo"
              @error="imageError = true"
            />
            <div v-else class="worker-detail-photo-placeholder">
              <span>{{ imageError ? 'Photo unavailable' : 'No photo attached' }}</span>
            </div>
          </div>
        </section>

        <ErrorAlert v-if="actionError" title="Could not update task" :message="actionError" />

        <section
          v-if="isCompleted"
          class="worker-detail-card worker-detail-completed d-flex flex-column gap-3"
          role="status"
        >
          <p class="mb-0 fw-semibold">Work completed. Thank you.</p>
          <RouterLink to="/worker" class="btn btn-primary worker-detail-action-btn w-100">
            Back to my tasks
          </RouterLink>
        </section>

        <WorkerCompleteForm
          v-if="canComplete"
          :task-id="String(task.id)"
          @completed="handleTaskCompleted"
        />
      </div>

      <!-- Sticky bottom action bar -->
      <div v-if="!isCompleted && (canStart || canDefer)" class="worker-detail-sticky-bar">
        <div class="worker-detail-sticky-bar__inner">
          <button
            v-if="canStart"
            type="button"
            class="btn worker-detail-primary-btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
            :disabled="isStarting || isDeferring"
            @click="handleStartWork"
          >
            <LoadingSpinner v-if="isStarting" size="sm" label="Starting task" />
            <span>{{ isStarting ? 'Starting task...' : 'Start task' }}</span>
          </button>

          <button
            v-if="canDefer && !showDeferForm"
            type="button"
            class="btn worker-detail-secondary-btn w-100"
            :disabled="isStarting"
            @click="openDeferForm"
          >
            I can't do this today
          </button>

          <form
            v-if="canDefer && showDeferForm"
            class="worker-detail-card worker-detail-defer-form d-flex flex-column gap-3"
            novalidate
            @submit.prevent="handleDeferSubmit"
          >
            <div>
              <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
                <label for="defer-reason" class="form-label mb-0">Reason</label>
                <span
                  class="worker-detail-counter"
                  :class="{ 'worker-detail-counter--invalid': isReasonTooLong }"
                >
                  {{ trimmedReasonLength }} / {{ DEFER_REASON_MAX }}
                </span>
              </div>
              <textarea
                id="defer-reason"
                v-model="deferReason"
                rows="3"
                class="form-control"
                :class="{ 'is-invalid': Boolean(displayedReasonError) }"
                placeholder="Explain why this task needs to be returned to the queue"
                :disabled="isDeferring"
                aria-describedby="defer-reason-help"
              />
              <div id="defer-reason-help" class="form-text">
                {{ DEFER_REASON_MIN }} to {{ DEFER_REASON_MAX }} characters required.
              </div>
              <div v-if="displayedReasonError" class="invalid-feedback d-block">
                {{ displayedReasonError }}
              </div>
            </div>

            <div class="d-flex align-items-center gap-2">
              <button
                type="submit"
                class="btn btn-primary worker-detail-action-btn d-inline-flex align-items-center justify-content-center gap-2 flex-grow-1"
                :disabled="!isReasonValid || isDeferring"
              >
                <LoadingSpinner v-if="isDeferring" size="sm" label="Deferring task" />
                <span>{{ isDeferring ? 'Deferring...' : 'Submit defer' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary worker-detail-action-btn"
                :disabled="isDeferring"
                @click="closeDeferForm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.worker-detail-page {
  background-color: var(--ns-worker-page-bg);
  min-height: 100%;
}

.worker-detail-body {
  padding: 0 16px calc(140px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: -30px;
  position: relative;
  z-index: 2;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.worker-detail-card {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-worker-tab-border);
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(14, 34, 51, 0.04);
  padding: 16px 18px;
}

.worker-detail-card-title {
  font-family: var(--ns-font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--ns-login-navy);
  margin: 0 0 12px;
}

.worker-detail-description {
  font-family: var(--ns-font-body);
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--ns-ink);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.worker-detail-location-pin-block {
  height: 96px;
  background-color: #E8F0F5;
  background-image: linear-gradient(rgba(14, 34, 51, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14, 34, 51, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
}

.worker-detail-location-pin-icon {
  width: 28px;
  height: 28px;
  color: var(--ns-login-teal);
}

.worker-detail-location-zone {
  font-family: var(--ns-font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin: 0 0 12px;
}

.worker-detail-photo-wrap {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--ns-worker-tab-border);
  background-color: var(--ns-worker-page-bg);
}

.worker-detail-photo {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  display: block;
}

.worker-detail-photo-placeholder {
  width: 100%;
  min-height: 140px;
  display: grid;
  place-items: center;
  background-color: #F8FAFC;
  color: #64748B;
  font-size: 0.875rem;
  font-weight: 500;
}

.worker-detail-back,
.worker-detail-action-btn {
  min-width: 44px;
  min-height: 44px;
}

.worker-detail-directions-note {
  font-size: 0.8125rem;
  color: #64748B;
}

.worker-detail-deferred,
.worker-detail-completed {
  background-color: var(--ns-success-bg);
  border-color: var(--ns-success-fg);
  color: var(--ns-success-fg);
}

.worker-detail-counter {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: #64748B;
}

.worker-detail-counter--invalid {
  color: #B91C1C;
  font-weight: 600;
}

/* Sticky action bar styling */
.worker-detail-sticky-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1020;
  background-color: var(--ns-paper);
  border-top: 1px solid #E3EAF0;
  box-shadow: 0 -10px 28px rgba(14, 34, 51, 0.1);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
}

.worker-detail-sticky-bar__inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.worker-detail-primary-btn {
  height: 54px;
  min-height: 54px;
  border-radius: 14px;
  background: var(--ns-login-gradient);
  color: var(--ns-paper);
  font-family: var(--ns-font-body);
  font-size: 16px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 14px rgba(11, 114, 133, 0.28);
}

.worker-detail-primary-btn:hover:not(:disabled),
.worker-detail-primary-btn:focus-visible:not(:disabled) {
  opacity: 0.95;
  color: var(--ns-paper);
}

.worker-detail-primary-btn:disabled {
  opacity: 0.65;
  color: var(--ns-paper);
}

.worker-detail-secondary-btn {
  height: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #5B6B7A;
  font-family: var(--ns-font-body);
  font-size: 14px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.worker-detail-secondary-btn:hover:not(:disabled) {
  color: var(--ns-ink);
  background: rgba(14, 34, 51, 0.04);
}
</style>
