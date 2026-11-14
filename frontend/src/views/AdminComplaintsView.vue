<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import ComplaintFilters from '../components/admin/ComplaintFilters.vue'
import { fetchAdminComplaints, fetchStats } from '../api/adminApi'
import { fetchZones } from '../api/referenceApi'
import { getErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/formatDate'

const columns = [
  { key: 'tracking_code', label: 'Tracking code' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'zone', label: 'Zone' },
  { key: 'assigned_worker', label: 'Assigned worker' },
  { key: 'sla_deadline', label: 'Deadline' },
  { key: 'created_at', label: 'Created' },
]

const complaints = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')

const route = useRoute()
const router = useRouter()

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

async function loadAuxiliaryOptions() {
  try {
    const [statsResult, zonesResult] = await Promise.allSettled([fetchStats(), fetchZones()])

    if (statsResult.status === 'fulfilled' && statsResult.value?.by_category) {
      categories.value = statsResult.value.by_category
        .map((c) => (typeof c === 'string' ? c : c?.category))
        .filter(Boolean)
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
    <PageHeader title="Complaints" :subtitle="subtitle" />

    <ComplaintFilters
      :filters="filters"
      :categories="categories"
      :zones="zones"
      @update="handleFiltersUpdate"
    />

    <LoadingSpinner v-if="isLoading && !hasLoaded" centered label="Loading complaints..." />

    <ErrorAlert
      v-else-if="error"
      class="mb-4"
      title="Could not load complaints"
      :message="error"
      show-retry
      @retry="loadComplaints"
    />

    <template v-else-if="hasLoaded">
      <EmptyState
        v-if="complaints.length === 0 && hasActiveFilters"
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

      <EmptyState
        v-else-if="complaints.length === 0"
        title="No complaints yet"
        message="Complaints for your department will appear here."
      />

      <div v-else class="ns-complaints-table-container">
        <DataTable :columns="columns" :rows="complaints" row-key="id">
          <template #cell-tracking_code="{ row }">
            <RouterLink :to="'/admin/complaints/' + row.id" class="ns-tracking-link">
              {{ row.tracking_code }}
            </RouterLink>
          </template>

          <template #cell-status="{ row }">
            <StatusBadge :status="row.status" />
          </template>

          <template #cell-priority="{ row }">
            <PriorityBadge :priority="row.priority" />
          </template>

          <template #cell-zone="{ row }">
            <span>{{ row.zone?.name || '-' }}</span>
          </template>

          <template #cell-assigned_worker="{ row }">
            <span v-if="row.assigned_worker?.name">{{ row.assigned_worker.name }}</span>
            <span v-else class="text-secondary">Unassigned</span>
          </template>

          <template #cell-sla_deadline="{ row }">
            <div class="d-inline-flex align-items-center flex-wrap gap-1">
              <span>{{ formatDateTime(row.sla_deadline) }}</span>
              <span
                v-if="row.is_overdue && row.status !== 'Completed'"
                class="ns-overdue-flag"
              >
                Overdue
              </span>
            </div>
          </template>

          <template #cell-created_at="{ row }">
            <span>{{ formatDateTime(row.created_at) }}</span>
          </template>
        </DataTable>

        <div class="ns-pagination-bar d-flex align-items-center justify-content-between flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary ns-page-btn"
            :disabled="page <= 1 || isLoading"
            @click="goToPage(page - 1)"
          >
            Previous
          </button>

          <span class="ns-page-info text-secondary small fw-medium">
            Page {{ page }} of {{ totalPages }}
          </span>

          <button
            type="button"
            class="btn btn-outline-secondary ns-page-btn"
            :disabled="page >= totalPages || isLoading"
            @click="goToPage(page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-complaints-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ns-complaints-table-container {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  overflow: hidden;
}

.ns-tracking-link {
  font-weight: 600;
  color: var(--ns-harbour);
  text-decoration: none;
}

.ns-tracking-link:hover {
  color: var(--ns-harbour-dark);
  text-decoration: underline;
}

.ns-tracking-link:focus-visible {
  outline: 2px solid var(--ns-harbour);
  outline-offset: 2px;
  border-radius: 2px;
}

.ns-overdue-flag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--ns-radius-control);
  background-color: var(--ns-danger-bg);
  color: var(--ns-danger-fg);
  border: 1px solid rgba(180, 35, 24, 0.2);
}

.ns-pagination-bar {
  border-top: 1px solid var(--ns-line);
  padding: 0.75rem 1rem;
  background-color: var(--ns-paper);
}

.ns-page-btn {
  min-height: 44px;
  min-width: 90px;
  border-radius: var(--ns-radius-control);
  font-weight: 500;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ns-page-btn:focus-visible {
  outline: 2px solid var(--ns-harbour);
  outline-offset: 2px;
}

.ns-page-info {
  color: var(--ns-slate);
  font-size: 0.875rem;
}


</style>
