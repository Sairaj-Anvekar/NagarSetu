<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import ComplaintFilters from '../components/admin/ComplaintFilters.vue'
import DeadlineCell from '../components/admin/DeadlineCell.vue'
import WorkerCell from '../components/admin/WorkerCell.vue'
import { exportAdminComplaintsCsv, fetchAdminComplaints, fetchStats } from '../api/adminApi'
import { fetchZones } from '../api/referenceApi'
import { getActivePinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { getErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/formatDate'
import { buildComplaintsCsvFilename, downloadBlob } from '../utils/downloadBlob'

const columns = [
  { key: 'tracking_code', label: 'Tracking code' },
  { key: 'category', label: 'Category' },
  { key: 'zone', label: 'Zone' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'sla_deadline', label: 'Deadline' },
  { key: 'assigned_worker', label: 'Worker' },
]

const complaints = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const isExporting = ref(false)
const exportError = ref('')

const route = useRoute()
const router = useRouter()
const authStore = getActivePinia() ? useAuthStore() : null

const filters = ref({
  q: '',
  status: '',
  category: '',
  zoneId: '',
  overdue: false,
  unassigned: false,
})

const categories = ref([])
const zones = ref([])
const statsTotals = ref(null)

const eyebrow = computed(() => {
  const dept = authStore?.user?.department?.name || authStore?.user?.department || ''
  if (!dept || typeof dept !== 'string') return ''
  const upper = dept.trim().toUpperCase()
  return upper.endsWith('DEPARTMENT') ? upper : `${upper} DEPARTMENT`
})

function parseQuery(query = {}) {
  const parsedPage = parseInt(query?.page, 10)
  return {
    filters: {
      q: typeof query?.q === 'string' ? query.q : '',
      status: typeof query?.status === 'string' ? query.status : '',
      category: typeof query?.category === 'string' ? query.category : '',
      zoneId: query?.zone_id !== undefined && query?.zone_id !== null ? String(query.zone_id) : '',
      overdue: query?.overdue === 'true',
      unassigned: query?.unassigned === 'true',
    },
    page: !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  }
}

function buildQuery(newFilters, newPage) {
  const query = {}
  if (newFilters?.status) query.status = newFilters.status
  if (newFilters?.category) query.category = newFilters.category
  if (newFilters?.zoneId) query.zone_id = String(newFilters.zoneId)
  if (newFilters?.overdue) query.overdue = 'true'
  if (newFilters?.unassigned) query.unassigned = 'true'
  if (typeof newFilters?.q === 'string' && newFilters.q.trim()) query.q = newFilters.q.trim()
  if (newPage > 1) query.page = String(newPage)
  return query
}

function areQueriesEqual(q1, q2) {
  const keys1 = Object.keys(q1 || {})
  const keys2 = Object.keys(q2 || {})
  if (keys1.length !== keys2.length) return false
  return keys1.every((k) => String(q1[k]) === String(q2[k]))
}

const subtitle = computed(() => {
  if (!hasLoaded.value && isLoading.value) {
    return 'Loading...'
  }
  const count = total.value
  return `${count} ${count === 1 ? 'complaint' : 'complaints'}`
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / pageSize.value))
})

const displayedPages = computed(() => {
  const current = page.value
  const count = totalPages.value
  if (count <= 5) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - 2)
  let end = Math.min(count, start + 4)
  if (end - start < 4) {
    start = Math.max(1, end - 4)
  }
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const showingSummary = computed(() => {
  if (total.value === 0) return 'Showing 0 complaints'
  const start = (page.value - 1) * pageSize.value + 1
  const end = Math.min(page.value * pageSize.value, total.value)
  return `Showing ${start} to ${end} of ${total.value} complaints`
})

const hasActiveFilters = computed(() => {
  const f = filters.value || {}
  return Boolean(
    (typeof f.q === 'string' && f.q.trim() !== '') ||
      Boolean(f.status) ||
      Boolean(f.category) ||
      (f.zoneId !== undefined && f.zoneId !== null && f.zoneId !== '') ||
      f.overdue === true ||
      f.unassigned === true,
  )
})

async function loadComplaints() {
  isLoading.value = true
  error.value = ''

  try {
    const result = await fetchAdminComplaints({
      ...filters.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    complaints.value = result.items
    total.value = result.total
    page.value = result.page
    pageSize.value = result.pageSize
    hasLoaded.value = true
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to load complaints.')
  } finally {
    isLoading.value = false
  }
}

function handleFiltersUpdate(newFilters) {
  const nextQuery = buildQuery(newFilters, 1)
  const currentQuery = route?.query || {}

  if (areQueriesEqual(nextQuery, currentQuery)) {
    filters.value = { ...newFilters }
    page.value = 1
    loadComplaints()
    return
  }

  if (router?.replace) {
    router.replace({ query: nextQuery })
  } else {
    filters.value = { ...newFilters }
    page.value = 1
    loadComplaints()
  }
}

function handleClearFilters() {
  handleFiltersUpdate({
    q: '',
    status: '',
    category: '',
    zoneId: '',
    overdue: false,
    unassigned: false,
  })
}

async function handleExportCsv() {
  if (isExporting.value) return

  isExporting.value = true
  exportError.value = ''

  try {
    const blob = await exportAdminComplaintsCsv({
      status: filters.value.status,
      category: filters.value.category,
      zoneId: filters.value.zoneId,
      overdue: filters.value.overdue,
      unassigned: filters.value.unassigned,
      q: filters.value.q,
    })
    const filename = buildComplaintsCsvFilename()
    downloadBlob(blob, filename)
  } catch (err) {
    exportError.value = getErrorMessage(err, 'Failed to export complaints. Please try again.')
  } finally {
    isExporting.value = false
  }
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > totalPages.value || newPage === page.value || isLoading.value) {
    return
  }
  const nextQuery = buildQuery(filters.value, newPage)
  if (router?.push) {
    router.push({ query: nextQuery })
  } else {
    page.value = newPage
    loadComplaints()
  }
}

function handleRowClick(row) {
  if (!row?.id) return
  if (router?.push) {
    router.push('/admin/complaints/' + row.id)
  }
}

async function loadAuxiliaryOptions() {
  try {
    const [statsResult, zonesResult] = await Promise.allSettled([fetchStats(), fetchZones()])

    if (statsResult.status === 'fulfilled' && statsResult.value) {
      if (statsResult.value.by_category) {
        categories.value = statsResult.value.by_category
          .map((c) => (typeof c === 'string' ? c : c?.category))
          .filter(Boolean)
      }
      if (statsResult.value.totals) {
        statsTotals.value = statsResult.value.totals
      }
    }

    if (zonesResult.status === 'fulfilled' && Array.isArray(zonesResult.value)) {
      zones.value = zonesResult.value
    }
  } catch {
    // Non-blocking: failure in auxiliary options never halts the primary complaints list
  }
}

watch(
  () => (route ? { ...route.query } : null),
  (newQuery, oldQuery) => {
    if (!newQuery) return
    if (oldQuery && areQueriesEqual(newQuery, oldQuery)) return
    const parsed = parseQuery(newQuery)
    filters.value = parsed.filters
    page.value = parsed.page
    loadComplaints()
  },
)

onMounted(() => {
  loadAuxiliaryOptions()
  const initial = parseQuery(route?.query || {})
  filters.value = initial.filters
  page.value = initial.page
  loadComplaints()
})
</script>

<template>
  <div class="admin-complaints-view">
    <!-- Header Row -->
    <header class="ns-complaints-header">
      <div class="ns-header-left">
        <p v-if="eyebrow" class="ns-eyebrow">{{ eyebrow }}</p>
        <h1 class="ns-page-title">Complaints</h1>
        <p class="ns-page-subtitle">Search, filter and review every complaint in your department.</p>
        <p class="ns-header-count visually-hidden">{{ subtitle }}</p>
      </div>

      <div class="ns-header-right">
        <button
          type="button"
          class="btn ns-export-btn"
          :disabled="isExporting"
          @click="handleExportCsv"
        >
          <LoadingSpinner v-if="isExporting" size="sm" label="Preparing export..." />
          <svg
            v-else
            class="ns-export-icon"
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>{{ isExporting ? 'Preparing...' : 'Export CSV' }}</span>
        </button>
      </div>
    </header>

    <ErrorAlert
      v-if="exportError"
      class="mb-3"
      title="Export failed"
      :message="exportError"
    />

    <!-- Filter Card -->
    <ComplaintFilters
      :filters="filters"
      :categories="categories"
      :zones="zones"
      :counts="statsTotals"
      @update="handleFiltersUpdate"
    />

    <!-- Loading State -->
    <LoadingSpinner v-if="isLoading && !hasLoaded" centered label="Loading complaints..." />

    <!-- Error State -->
    <div v-else-if="error" class="ns-state-card">
      <ErrorAlert
        title="Could not load complaints"
        :message="error"
        show-retry
        @retry="loadComplaints"
      />
    </div>

    <!-- Loaded Content: Empty or Table -->
    <template v-else-if="hasLoaded">
      <div v-if="complaints.length === 0 && hasActiveFilters" class="ns-state-card">
        <EmptyState
          title="No complaints match these filters"
          message="Try adjusting your filters or search terms."
        >
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            @click="handleClearFilters"
          >
            Clear filters
          </button>
        </EmptyState>
      </div>

      <div v-else-if="complaints.length === 0" class="ns-state-card">
        <EmptyState
          title="No complaints yet"
          message="Complaints for your department will appear here."
        />
      </div>

      <!-- Table Card -->
      <div v-else class="ns-table-card">
        <DataTable
          :columns="columns"
          :rows="complaints"
          row-key="id"
          variant="admin"
          @row-click="handleRowClick"
        >
          <template #cell-tracking_code="{ row }">
            <div class="ns-tracking-cell">
              <RouterLink :to="'/admin/complaints/' + row.id" class="ns-tracking-link">
                {{ row.tracking_code }}
              </RouterLink>
              <span class="ns-tracking-time">{{ formatDateTime(row.created_at) }}</span>
            </div>
          </template>

          <template #cell-category="{ row }">
            <span class="ns-category-cell">{{ row.category || '—' }}</span>
          </template>

          <template #cell-zone="{ row }">
            <span class="ns-zone-cell">{{ row.zone?.name || '-' }}</span>
          </template>

          <template #cell-priority="{ row }">
            <PriorityBadge v-if="row.priority" :priority="row.priority" />
            <span v-else>—</span>
          </template>

          <template #cell-status="{ row }">
            <StatusBadge v-if="row.status" :status="row.status" />
            <span v-else>—</span>
          </template>

          <template #cell-sla_deadline="{ row }">
            <DeadlineCell :row="row" />
          </template>

          <template #cell-assigned_worker="{ row }">
            <WorkerCell :worker="row.assigned_worker" />
          </template>
        </DataTable>

        <!-- Table Card Footer with Pagination -->
        <div class="ns-table-footer">
          <div class="ns-footer-summary">
            <span class="ns-showing-text">{{ showingSummary }}</span>
            <span class="ns-page-info visually-hidden">Page {{ page }} of {{ totalPages }}</span>
          </div>

          <div class="ns-pagination-controls" role="navigation" aria-label="Complaints pagination">
            <button
              type="button"
              class="btn ns-page-btn ns-page-nav-btn"
              :disabled="page <= 1 || isLoading"
              aria-label="Previous page"
              @click="goToPage(page - 1)"
            >
              Previous
            </button>

            <div class="ns-page-numbers">
              <button
                v-for="p in displayedPages"
                :key="p"
                type="button"
                class="ns-page-num-btn"
                :class="{ 'ns-page-num-btn--active': p === page }"
                :aria-current="p === page ? 'page' : undefined"
                @click="goToPage(p)"
              >
                {{ p }}
              </button>
            </div>

            <button
              type="button"
              class="btn ns-page-btn ns-page-nav-btn"
              :disabled="page >= totalPages || isLoading"
              aria-label="Next page"
              @click="goToPage(page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-complaints-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header Row */
.ns-complaints-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.4;
}

.ns-count-badge {
  font-size: 12px;
  font-weight: 600;
  color: #0B6A7C;
  background-color: #D8F1F3;
  padding: 2px 8px;
  border-radius: 999px;
  line-height: 1;
}

.ns-export-btn {
  height: 46px;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1.5px solid #CBD5E1;
  background-color: #FFFFFF;
  color: #0B5C70;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 150ms ease;
}

.ns-export-btn:hover:not(:disabled) {
  background-color: #F8FAFC;
  border-color: #94A3B8;
  color: #0E4F6B;
}

.ns-export-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.ns-export-icon {
  flex-shrink: 0;
}

/* State Card (Empty and Error) */
.ns-state-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 32px 24px;
}

/* Table Card */
.ns-table-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  overflow: hidden;
}

.ns-tracking-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ns-tracking-link {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 13px;
  font-weight: 700;
  color: #0B6E99;
  text-decoration: none;
}

.ns-tracking-link:hover {
  color: #095A7E;
  text-decoration: underline;
}

.ns-tracking-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
  border-radius: 2px;
}

.ns-tracking-time {
  font-size: 12px;
  color: #5F6F7E;
}

.ns-category-cell {
  font-size: 13px;
  font-weight: 600;
  color: #0E2233;
}

.ns-zone-cell {
  font-size: 13px;
  color: #334155;
}

/* Badges styling overrides in complaints view table */
:deep(.ns-badge) {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 8px;
  line-height: 1;
}

:deep(.ns-badge::before) {
  display: none;
}

:deep(.ns-badge--critical) {
  background-color: #FFE4E6 !important;
  color: #9F1239 !important;
}

:deep(.ns-badge--high) {
  background-color: #FFEDD5 !important;
  color: #9A3412 !important;
}

:deep(.ns-badge--medium) {
  background-color: #FEF3C7 !important;
  color: #92400E !important;
}

:deep(.ns-badge--low) {
  background-color: #E0EEFF !important;
  color: #1D4ED8 !important;
  border-color: transparent !important;
}

:deep(.ns-badge--submitted) {
  background-color: #E0EEFF !important;
  color: #1D4ED8 !important;
}

:deep(.ns-badge--in-progress) {
  background-color: #FEF3C7 !important;
  color: #92400E !important;
}

:deep(.ns-badge--completed) {
  background-color: #DCFCE7 !important;
  color: #166534 !important;
}

/* Table Footer & Pagination */
.ns-table-footer {
  border-top: 1px solid #EEF3F7;
  padding: 14px 20px;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.ns-showing-text {
  font-size: 13px;
  font-weight: 500;
  color: #4B5B6B;
}

.ns-pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ns-page-nav-btn {
  height: 40px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.ns-page-nav-btn:hover:not(:disabled) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
}

.ns-page-nav-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.ns-page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ns-page-num-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 10px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
}

.ns-page-num-btn:hover:not(.ns-page-num-btn--active) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
}

.ns-page-num-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

.ns-page-num-btn--active {
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  border-color: transparent;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(11, 114, 133, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .ns-export-btn,
  .ns-page-nav-btn,
  .ns-page-num-btn {
    transition: none;
  }
}
</style>
