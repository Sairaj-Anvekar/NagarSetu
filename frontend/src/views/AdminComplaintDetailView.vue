<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ComplaintSummaryCard from '../components/admin/ComplaintSummaryCard.vue'
import ComplaintPhotoCard from '../components/admin/ComplaintPhotoCard.vue'
import ComplaintTimelineCard from '../components/admin/ComplaintTimelineCard.vue'
import ComplaintAssignedWorkerCard from '../components/admin/ComplaintAssignedWorkerCard.vue'
import { fetchAdminComplaint } from '../api/adminApi'
import { getErrorMessage } from '../utils/apiError'
import { formatOverdueDays } from '../utils/complaintTimeline'

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

const overdueChipText = computed(() => {
  if (!isOverdue.value) return ''
  return formatOverdueDays(complaint.value) || 'Overdue'
})

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
  <div class="admin-complaint-detail-view">
    <LoadingSpinner v-if="isLoading" centered label="Loading complaint..." />

    <div v-else-if="isNotFound" class="ns-state-card">
      <EmptyState
        title="Complaint not found"
        message="The requested complaint could not be found or belongs to another department."
      >
        <RouterLink to="/admin/complaints" class="btn btn-primary btn-sm back-link">
          Back to complaints
        </RouterLink>
      </EmptyState>
    </div>

    <div v-else-if="isForbidden" class="ns-state-card">
      <ErrorAlert
        title="Access Denied"
        :message="error"
      />
    </div>

    <div v-else-if="error" class="ns-state-card">
      <ErrorAlert
        title="Could not load complaint"
        :message="error"
        show-retry
        @retry="loadComplaint"
      />
    </div>

    <div v-else-if="complaint" class="admin-complaint-detail-content">
      <!-- Back Navigation Link -->
      <nav class="ns-back-nav mb-3" aria-label="Breadcrumb navigation">
        <RouterLink
          to="/admin/complaints"
          class="btn ns-back-btn back-link"
          @click="handleBack"
        >
          <svg
            class="ns-back-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to complaints</span>
        </RouterLink>
      </nav>

      <!-- Header Section -->
      <header class="ns-complaint-header mb-4">
        <p class="ns-eyebrow">COMPLAINT</p>
        <div class="ns-header-main d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div class="ns-header-left">
            <h1 class="ns-page-title mb-2">{{ complaint.tracking_code || '' }}</h1>
            <div class="ns-header-chips d-flex align-items-center flex-wrap gap-2">
              <StatusBadge v-if="complaint.status" :status="complaint.status" />
              <PriorityBadge v-if="complaint.priority" :priority="complaint.priority" />
              <span
                v-if="overdueChipText"
                class="ns-chip-overdue"
                role="status"
              >
                {{ overdueChipText }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- Two-Column Layout (Desktop 2:1, stacking below 992px) -->
      <div class="row g-4 align-items-start">
        <!-- Left Column: Summary and Photos -->
        <div class="col-12 col-lg-8 ns-left-column">
          <!-- Complaint Summary Card -->
          <ComplaintSummaryCard :complaint="complaint" />

          <!-- Citizen Photo Card (only if citizen photo exists) -->
          <ComplaintPhotoCard
            v-if="complaint.image_url"
            variant="citizen"
            :photo-url="complaint.image_url"
            title="Photo from citizen"
          />

          <!-- Resolution Photo Card -->
          <ComplaintPhotoCard
            variant="resolution"
            :is-completed="complaint.status === 'Completed'"
            :photo-url="complaint.resolution?.photo_url || null"
            :resolution="complaint.resolution"
            title="Resolution"
          />
        </div>

        <!-- Right Column: Timeline and Assignment -->
        <div class="col-12 col-lg-4 ns-right-column">
          <!-- Status Timeline Card (with preserved status history) -->
          <ComplaintTimelineCard :complaint="complaint" />

          <!-- Assigned Worker Card -->
          <ComplaintAssignedWorkerCard :complaint="complaint" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-complaint-detail-view {
  min-height: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* State cards (Error, Not Found, Forbidden) */
.ns-state-card {
  background-color: var(--ns-complaint-card-bg, #FFFFFF);
  border: 1px solid var(--ns-complaint-card-border, #E3EAF0);
  border-radius: var(--ns-complaint-card-radius, 18px);
  box-shadow: var(--ns-complaint-card-shadow, 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06));
  padding: 32px 24px;
}

/* Back navigation */
.ns-back-btn {
  height: 42px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1.5px solid #CBD5E1;
  background-color: #FFFFFF;
  color: #0B5C70;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all 150ms ease;
}

.ns-back-btn:hover {
  background-color: #F8FAFC;
  border-color: #94A3B8;
  color: #0E4F6B;
}

.ns-back-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.ns-back-icon {
  flex-shrink: 0;
}

/* Complaint Header */
.ns-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #0B6A7C;
  text-transform: uppercase;
  margin-bottom: 4px;
  line-height: 1.2;
}

.ns-page-title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 28px;
  font-weight: 700;
  color: #0E2233;
  margin-bottom: 0;
  line-height: 1.2;
}

/* Header chips */
.ns-chip-overdue {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  background-color: #FEE2E2;
  color: #B91C1C;
  letter-spacing: 0.02em;
}

.timeline-list {
  padding-left: 0;
}

.resolution-photo-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.resolution-photo {
  max-width: 320px;
  max-height: 240px;
  object-fit: cover;
  border-radius: var(--ns-radius-md, 0.375rem);
}

@media (prefers-reduced-motion: reduce) {
  .ns-back-btn {
    transition: none;
  }
}
</style>
