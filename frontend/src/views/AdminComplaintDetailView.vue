<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppCard from '../components/AppCard.vue'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { fetchAdminComplaint } from '../api/adminApi'
import { getErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/formatDate'

const route = useRoute()
const router = useRouter()

const complaint = ref(null)
const isLoading = ref(false)
const isNotFound = ref(false)
const isForbidden = ref(false)
const error = ref('')

let requestId = 0
let isMounted = false

const isOverdue = computed(() => {
  return Boolean(complaint.value?.is_overdue) && complaint.value?.status !== 'Completed'
})

const deferredCountText = computed(() => {
  const count = complaint.value?.carry_forward_count
  if (typeof count === 'number' && count > 0) {
    return `Deferred ${count} ${count === 1 ? 'time' : 'times'}`
  }
  return ''
})

function formatEventType(type) {
  if (!type || typeof type !== 'string') return 'Update'
  const mapping = {
    created: 'Submitted',
    assigned: 'Assigned',
    started: 'Work started',
    deferred: 'Deferred',
    resolved: 'Completed',
  }
  return mapping[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1)
}

function formatActor(actor) {
  if (!actor || typeof actor !== 'string') return ''
  const mapping = {
    citizen: 'Citizen',
    worker: 'Worker',
    admin: 'Administrator',
    system: 'System',
  }
  return mapping[actor.toLowerCase()] || actor.charAt(0).toUpperCase() + actor.slice(1)
}

function handleBack(event) {
  const previous = window.history?.state?.back
  if (typeof previous === 'string' && previous.includes('/admin/complaints')) {
    event?.preventDefault()
    router.back()
  }
}

async function loadComplaint() {
  const complaintId = route.params.id
  const currentRequestId = ++requestId

  isLoading.value = true
  isNotFound.value = false
  isForbidden.value = false
  error.value = ''

  try {
    const data = await fetchAdminComplaint(String(complaintId ?? ''))
    if (!isMounted || currentRequestId !== requestId) return

    complaint.value = data
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return

    complaint.value = null
    const status = err?.response?.status

    if (status === 404) {
      isNotFound.value = true
    } else if (status === 403) {
      isForbidden.value = true
      error.value = 'You do not have permission to view this complaint.'
    } else {
      error.value = getErrorMessage(err, 'Failed to load complaint details.')
    }
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

onMounted(() => {
  isMounted = true
  loadComplaint()
})

onBeforeUnmount(() => {
  isMounted = false
})

watch(
  () => route.params.id,
  () => {
    loadComplaint()
  },
)
</script>

<template>
  <div class="admin-complaint-detail-container p-3 p-md-4">
    <LoadingSpinner v-if="isLoading" centered label="Loading complaint..." />

    <EmptyState
      v-else-if="isNotFound"
      title="Complaint not found"
      message="The requested complaint could not be found or belongs to another department."
    >
      <RouterLink to="/admin/complaints" class="btn btn-primary btn-sm back-link">
        Back to complaints
      </RouterLink>
    </EmptyState>

    <ErrorAlert
      v-else-if="isForbidden"
      title="Access Denied"
      :message="error"
    />

    <ErrorAlert
      v-else-if="error"
      title="Could not load complaint"
      :message="error"
      show-retry
      @retry="loadComplaint"
    />

    <div v-else-if="complaint" class="admin-complaint-detail-content">
      <div class="mb-3">
        <RouterLink
          to="/admin/complaints"
          class="btn btn-outline-secondary btn-sm back-link"
          @click="handleBack"
        >
          Back to complaints
        </RouterLink>
      </div>

      <PageHeader :title="complaint.tracking_code || ''">
        <template #actions>
          <div class="d-flex align-items-center gap-2">
            <StatusBadge v-if="complaint.status" :status="complaint.status" />
            <PriorityBadge v-if="complaint.priority" :priority="complaint.priority" />
          </div>
        </template>
      </PageHeader>

      <!-- Details Section -->
      <AppCard title="Details" class="mb-4">
        <dl class="row mb-0">
          <dt class="col-sm-3 text-secondary">Category</dt>
          <dd class="col-sm-9 fw-semibold">{{ complaint.category || '—' }}</dd>

          <dt class="col-sm-3 text-secondary">Zone</dt>
          <dd class="col-sm-9">{{ complaint.zone?.name || '—' }}</dd>

          <dt class="col-sm-3 text-secondary">Created</dt>
          <dd class="col-sm-9">{{ formatDateTime(complaint.created_at) }}</dd>

          <dt class="col-sm-3 text-secondary">Deadline</dt>
          <dd class="col-sm-9 d-flex align-items-center flex-wrap gap-2">
            <span>{{ formatDateTime(complaint.sla_deadline) }}</span>
            <span v-if="isOverdue" class="badge bg-danger text-white">Overdue</span>
          </dd>

          <dt class="col-sm-3 text-secondary">Description</dt>
          <dd class="col-sm-9 mb-0 text-break">{{ complaint.description || 'No description provided.' }}</dd>
        </dl>
      </AppCard>

      <!-- Assignment Section -->
      <AppCard title="Assignment" class="mb-4">
        <dl class="row mb-0">
          <dt class="col-sm-3 text-secondary">Assigned worker</dt>
          <dd class="col-sm-9 fw-semibold">
            <span>{{ complaint.assigned_worker?.name || 'Unassigned' }}</span>
          </dd>

          <template v-if="deferredCountText">
            <dt class="col-sm-3 text-secondary">Deferred</dt>
            <dd class="col-sm-9">
              <span class="badge bg-secondary">{{ deferredCountText }}</span>
            </dd>
          </template>
        </dl>
      </AppCard>

      <!-- Status history Section -->
      <AppCard
        v-if="complaint.logs && complaint.logs.length > 0"
        title="Status history"
        class="mb-4"
      >
        <ol class="list-group list-group-flush mb-0 timeline-list">
          <li
            v-for="(log, idx) in complaint.logs"
            :key="idx"
            class="list-group-item px-0 py-2 d-flex flex-wrap justify-content-between align-items-center gap-2"
          >
            <div>
              <span class="fw-semibold">{{ formatEventType(log.event_type) }}</span>
              <span v-if="formatActor(log.actor_type)" class="text-secondary small ms-2">
                by {{ formatActor(log.actor_type) }}
              </span>
            </div>
            <time class="text-secondary small">{{ formatDateTime(log.created_at) }}</time>
          </li>
        </ol>
      </AppCard>

      <!-- Resolution Section (only for Completed) -->
      <AppCard
        v-if="complaint.status === 'Completed' && complaint.resolution"
        title="Resolution"
        class="mb-4"
      >
        <dl class="row mb-0">
          <dt class="col-sm-3 text-secondary">Resolution note</dt>
          <dd class="col-sm-9 mb-3 text-break">
            {{ complaint.resolution.note || 'No resolution note provided.' }}
          </dd>

          <template v-if="complaint.resolution.worker?.name">
            <dt class="col-sm-3 text-secondary">Resolved by</dt>
            <dd class="col-sm-9 mb-3">{{ complaint.resolution.worker.name }}</dd>
          </template>

          <template v-if="complaint.resolution.completed_at">
            <dt class="col-sm-3 text-secondary">Completed at</dt>
            <dd class="col-sm-9 mb-3">{{ formatDateTime(complaint.resolution.completed_at) }}</dd>
          </template>

          <template v-if="complaint.resolution.photo_url">
            <dt class="col-sm-3 text-secondary">Evidence photo</dt>
            <dd class="col-sm-9 mb-0">
              <a
                :href="complaint.resolution.photo_url"
                target="_blank"
                rel="noopener"
                class="resolution-photo-link d-inline-block"
              >
                <img
                  :src="complaint.resolution.photo_url"
                  alt="Resolution photo"
                  class="img-thumbnail resolution-photo"
                />
              </a>
            </dd>
          </template>
        </dl>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.admin-complaint-detail-container {
  min-height: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.back-link {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.back-link:focus-visible,
.resolution-photo-link:focus-visible {
  outline: 2px solid var(--ns-primary, #1e3a8a);
  outline-offset: 2px;
}

.timeline-list {
  padding-left: 0;
}

.resolution-photo {
  max-width: 320px;
  max-height: 240px;
  object-fit: cover;
  border-radius: var(--ns-radius-md, 0.375rem);
}
</style>
