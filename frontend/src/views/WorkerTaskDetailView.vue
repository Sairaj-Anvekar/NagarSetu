<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { deferTask, fetchTask, startTask } from '../api/complaintsApi'
import { getErrorMessage } from '../utils/apiError'
import { getFieldErrors } from '../utils/fieldErrors'
import { formatDateTime, getDueInfo } from '../utils/formatDate'
import { buildDirectionsUrl } from '../utils/googleMaps'
import { DEFER_REASON_MAX, DEFER_REASON_MIN } from '../utils/resolutionLimits'

const route = useRoute()

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
const dueInfo = computed(() => getDueInfo(task.value?.sla_deadline))
const formattedDeadline = computed(() => formatDateTime(task.value?.sla_deadline))
const directionsUrl = computed(() =>
  buildDirectionsUrl(task.value?.latitude, task.value?.longitude),
)
const canStart = computed(() => task.value?.status === 'Submitted')
const canDefer = computed(
  () => task.value?.status === 'Submitted' || task.value?.status === 'In-Progress',
)
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
    <header class="worker-detail-header d-flex align-items-center gap-3 mb-3">
      <RouterLink
        to="/worker"
        class="btn btn-outline-secondary worker-detail-back d-inline-flex align-items-center justify-content-center"
        aria-label="Back to my tasks"
      >
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
      <h1 class="worker-detail-title mb-0">{{ pageTitle }}</h1>
    </header>

    <div v-if="statusNotice" class="alert alert-warning mb-3" role="status">
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
      class="worker-detail-card worker-detail-deferred d-flex flex-column gap-3"
      role="status"
    >
      <p class="mb-0 fw-semibold">Task deferred. It has been returned to the queue.</p>
      <RouterLink to="/worker" class="btn btn-primary worker-detail-action-btn w-100">
        Back to my tasks
      </RouterLink>
    </section>

    <div v-else-if="task" class="worker-detail-content d-flex flex-column gap-3">
      <div class="worker-detail-photo-wrap">
        <img
          v-if="showPhoto"
          :src="task.image_url"
          :alt="`${task.category} complaint photo`"
          class="worker-detail-photo"
          @error="imageError = true"
        />
        <div v-else class="worker-detail-photo-placeholder">
          <span>Photo unavailable</span>
        </div>
      </div>

      <section class="worker-detail-card d-flex flex-column gap-3">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <PriorityBadge :priority="task.priority" />
          <StatusBadge :status="task.status" />
        </div>

        <div>
          <h2 class="worker-detail-category">{{ task.category }}</h2>
          <p class="worker-detail-description mb-0">{{ task.description }}</p>
        </div>

        <div class="worker-detail-deadline d-flex align-items-center flex-wrap gap-2">
          <AppIcon name="clock" :size="18" />
          <span
            class="worker-detail-relative"
            :class="{ 'worker-detail-relative--overdue': task.is_overdue }"
          >
            {{ dueInfo.text }}
          </span>
          <span v-if="task.is_overdue" class="worker-detail-overdue-pill">Overdue</span>
          <span class="worker-detail-deadline-time">{{ formattedDeadline }}</span>
        </div>

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

      <ErrorAlert v-if="actionError" title="Could not update task" :message="actionError" />

      <div v-if="canStart || canDefer" class="worker-detail-actions d-flex flex-column gap-2">
        <button
          v-if="canStart"
          type="button"
          class="btn btn-primary worker-detail-action-btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
          :disabled="isStarting || isDeferring"
          @click="handleStartWork"
        >
          <LoadingSpinner v-if="isStarting" size="sm" label="Starting work" />
          <span>{{ isStarting ? 'Starting work...' : 'Start work' }}</span>
        </button>

        <button
          v-if="canDefer && !showDeferForm"
          type="button"
          class="btn btn-outline-secondary worker-detail-action-btn w-100"
          :disabled="isStarting"
          @click="openDeferForm"
        >
          Defer task
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
</template>

<style scoped>
.worker-detail-back,
.worker-detail-action-btn {
  min-width: 44px;
  min-height: 44px;
}

.worker-detail-title {
  font-family: var(--ns-font-display);
  font-size: 1.375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ns-ink);
  min-width: 0;
  overflow-wrap: anywhere;
}

.worker-detail-photo-wrap {
  width: 100%;
  border-radius: var(--ns-radius-card);
  overflow: hidden;
  border: 1px solid var(--ns-line);
  background-color: var(--ns-neutral-bg);
}

.worker-detail-photo {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
}

.worker-detail-photo-placeholder {
  width: 100%;
  min-height: 180px;
  display: grid;
  place-items: center;
  background-color: var(--ns-neutral-bg);
  color: var(--ns-neutral-fg);
  font-size: 0.875rem;
  font-weight: 600;
}

.worker-detail-card {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  padding: 16px;
}

.worker-detail-deferred {
  background-color: var(--ns-success-bg);
  border-color: var(--ns-success-fg);
  color: var(--ns-success-fg);
}

.worker-detail-category {
  font-family: var(--ns-font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ns-ink);
  margin: 0 0 6px;
}

.worker-detail-description {
  color: var(--ns-ink);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.worker-detail-deadline {
  font-size: 0.875rem;
  color: var(--ns-ink);
}

.worker-detail-relative {
  font-weight: 500;
}

.worker-detail-relative--overdue {
  color: var(--ns-danger-fg);
  font-weight: 600;
}

.worker-detail-overdue-pill {
  background-color: var(--ns-danger-bg);
  color: var(--ns-danger-fg);
  border-radius: var(--ns-radius-pill);
  font-weight: 600;
  font-size: 0.75rem;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
}

.worker-detail-deadline-time,
.worker-detail-directions-note {
  font-size: 0.8125rem;
  color: var(--ns-slate);
}

.worker-detail-counter {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--ns-slate);
}

.worker-detail-counter--invalid {
  color: var(--ns-danger-fg);
  font-weight: 600;
}
</style>


