<script setup>
import { computed, onMounted, ref } from 'vue'
import { getActivePinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useTriageBadgeStore } from '../stores/triageBadge'
import { confirmTriageCategory, fetchTriageItems } from '../api/triageApi'
import { getErrorMessage } from '../utils/apiError'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import TriageTabs from '../components/admin/TriageTabs.vue'
import TriageList from '../components/admin/TriageList.vue'
import TriageReviewPanel from '../components/admin/TriageReviewPanel.vue'

const authStore = getActivePinia() ? useAuthStore() : null
const triageBadgeStore = getActivePinia() ? useTriageBadgeStore() : null

const activeTab = ref('pending')
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const pendingCount = ref(0)
const reviewedCount = ref(null)

const selectedItem = ref(null)

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const adminDepartment = computed(() => {
  return authStore?.user?.department?.name || authStore?.user?.department || 'Sanitation'
})

const eyebrow = computed(() => {
  const dept = adminDepartment.value
  const upper = dept.trim().toUpperCase()
  return upper.endsWith('DEPARTMENT') ? upper : `${upper} DEPARTMENT`
})

async function loadTriage() {
  isLoading.value = true
  error.value = ''

  try {
    const result = await fetchTriageItems({
      status: activeTab.value,
      page: page.value,
      pageSize: pageSize.value,
    })

    items.value = [...result.items]
    total.value = result.total
    page.value = result.page
    pageSize.value = result.pageSize

    if (activeTab.value === 'pending') {
      pendingCount.value = result.total
      if (page.value === 1 && triageBadgeStore) {
        triageBadgeStore.setPendingCount(result.total)
      }
    } else {
      reviewedCount.value = result.total
    }

    if (items.value.length > 0) {
      const match = selectedItem.value
        ? items.value.find((i) => i.id === selectedItem.value.id)
        : null
      selectedItem.value = match || items.value[0]
    } else {
      selectedItem.value = null
    }

    hasLoaded.value = true
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to load triage cases.')
  } finally {
    isLoading.value = false
  }
}

function handleTabChange(tab) {
  activeTab.value = tab
  page.value = 1
  selectedItem.value = null
  successMessage.value = ''
  errorMessage.value = ''
  loadTriage()
}

function handleSelectItem(item) {
  selectedItem.value = item
  errorMessage.value = ''
}

function handlePageChange(newPage) {
  page.value = newPage
  loadTriage()
}

async function handleConfirmCategory({ id, category }) {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await confirmTriageCategory(id, category)
    const movedDept = result.moved_to_department

    // Remove confirmed item from pending queue
    const index = items.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      total.value = Math.max(0, total.value - 1)
      pendingCount.value = total.value
      if (triageBadgeStore) {
        triageBadgeStore.decrementPendingCount()
      }
    }

    successMessage.value = movedDept ? `Moved to ${movedDept}` : 'Category confirmed'

    // Advance to next pending item
    if (items.value.length > 0) {
      const nextIndex = Math.min(index, items.value.length - 1)
      selectedItem.value = items.value[nextIndex]
    } else {
      selectedItem.value = null
    }
  } catch (err) {
    const status = err?.response?.status
    const detail =
      typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : ''

    if (status === 409 && detail.includes('already been reviewed')) {
      errorMessage.value = 'This case has already been reviewed'
      await loadTriage()
    } else if (status === 409 && detail.includes('handled')) {
      errorMessage.value =
        'Complaint is already being handled. Its category can no longer be changed.'
    } else if (status === 404) {
      errorMessage.value = 'This case no longer exists'
      await loadTriage()
    } else {
      errorMessage.value = getErrorMessage(
        err,
        'Failed to confirm category. Please try again.',
      )
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadTriage()
})
</script>

<template>
  <div class="admin-triage-view">
    <!-- Page Header Row -->
    <header class="ns-triage-header">
      <div class="ns-header-left">
        <p v-if="eyebrow" class="ns-eyebrow">{{ eyebrow }}</p>
        <h1 class="ns-page-title">Triage</h1>
        <p class="ns-page-subtitle">
          Complaints the AI was not sure about. Check the category so each one reaches the right team.
        </p>
      </div>

      <div class="ns-header-tabs">
        <TriageTabs
          :model-value="activeTab"
          :pending-count="pendingCount"
          :reviewed-count="reviewedCount"
          @update:model-value="handleTabChange"
        />
      </div>
    </header>

    <!-- Info Note -->
    <div class="ns-triage-info-note" role="note">
      <svg
        class="ns-info-icon"
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
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span>
        These complaints are already submitted and assigned using the AI guess. Changing the category may move a complaint to another team.
      </span>
    </div>

    <!-- Feedback Banners -->
    <div
      v-if="successMessage"
      class="alert alert-success d-flex align-items-center justify-content-between mb-0"
      role="alert"
      data-test="success-banner"
    >
      <div class="d-flex align-items-center gap-2">
        <svg
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>
      <button
        type="button"
        class="btn-close"
        aria-label="Dismiss message"
        @click="successMessage = ''"
      ></button>
    </div>

    <div
      v-if="errorMessage"
      class="alert alert-danger d-flex align-items-center justify-content-between mb-0"
      role="alert"
      data-test="error-banner"
    >
      <div class="d-flex align-items-center gap-2">
        <svg
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>
      <button
        type="button"
        class="btn-close"
        aria-label="Dismiss error"
        @click="errorMessage = ''"
      ></button>
    </div>

    <!-- Loading State -->
    <LoadingSpinner v-if="isLoading && !hasLoaded" centered label="Loading triage cases..." />

    <!-- Error State with Retry -->
    <div v-else-if="error" class="ns-state-card">
      <ErrorAlert
        title="Could not load triage cases"
        :message="error"
        show-retry
        @retry="loadTriage"
      />
    </div>

    <!-- Two-Column Workspace -->
    <div v-else-if="hasLoaded" class="ns-triage-grid">
      <!-- Left Column: List -->
      <section class="ns-triage-col-list" aria-label="Triage Queue">
        <TriageList
          :items="items"
          :selected-id="selectedItem?.id || ''"
          :status="activeTab"
          :total="total"
          :page="page"
          :page-size="pageSize"
          @select="handleSelectItem"
          @page-change="handlePageChange"
        />
      </section>

      <!-- Right Column: Review Panel -->
      <section class="ns-triage-col-review" aria-label="Case Inspector">
        <TriageReviewPanel
          :item="selectedItem"
          :status="activeTab"
          :is-submitting="isSubmitting"
          :admin-department="adminDepartment"
          @confirm="handleConfirmCategory"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-triage-view {
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-20, 20px);
  max-width: var(--ns-admin-content-max-width, 1440px);
  margin: 0 auto;
}

/* Header Row */
.ns-triage-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--ns-space-16, 16px);
  padding: 4px 0;
}

.ns-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ns-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #0B6A7C;
  text-transform: uppercase;
  margin-bottom: 0;
  line-height: 1.2;
}

.ns-page-title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 30px;
  font-weight: 700;
  color: #0E2233;
  margin-bottom: 0;
  line-height: 1.2;
}

.ns-page-subtitle {
  font-size: 15px;
  color: #4B5B6B;
  margin-bottom: 0;
  line-height: 1.4;
}

.ns-header-tabs {
  display: flex;
  align-items: center;
}

/* Info Note */
.ns-triage-info-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--ns-radius-control, 10px);
  background-color: var(--ns-info-bg, #E4F1F8);
  border: 1px solid var(--ns-primary-200, #BDDFEE);
  color: var(--ns-info-fg, #0B5C80);
  font-size: 13px;
  line-height: 1.45;
}

.ns-info-icon {
  flex-shrink: 0;
  color: #0B6E99;
}

/* Two-column responsive layout */
.ns-triage-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ns-space-20, 20px);
  align-items: start;
}

@media (min-width: 992px) {
  .ns-triage-grid {
    grid-template-columns: minmax(360px, 4.5fr) minmax(440px, 7.5fr);
    gap: var(--ns-space-24, 24px);
  }
}

.ns-state-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05);
  padding: 32px 24px;
}
</style>
