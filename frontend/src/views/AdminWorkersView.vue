<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import { fetchWorkers, setWorkerActive } from '../api/workersApi'
import { fetchStats } from '../api/adminApi'
import { computeZoneCoverage, DEFAULT_ZONES, getPrimaryZoneGap } from '../utils/workerZones'
import { getErrorMessage } from '../utils/apiError'
import { formatPhone } from '../utils/formatPhone'
import { labelOf } from '../utils/labelOf'

const workers = ref([])
const total = ref(0)
const zoneStats = ref([])
const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const actionError = ref('')

const pendingIds = reactive(new Set())
const confirmingId = ref('')

const filters = reactive({
  search: '',
  department: 'all',
  zone: 'all',
  status: 'all',
})

let requestId = 0
let isMounted = false

const columns = [
  { key: 'worker', label: 'Worker' },
  { key: 'zone', label: 'Zone' },
  { key: 'active_tasks', label: 'Active tasks' },
  { key: 'is_active', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const zoneCoverage = computed(() => {
  return computeZoneCoverage(workers.value, DEFAULT_ZONES)
})

const activeCount = computed(() => workers.value.filter((w) => w.is_active).length)
const inactiveCount = computed(() => workers.value.filter((w) => !w.is_active).length)

const subtitle = computed(() => {
  if (!hasLoaded.value) {
    return 'Complaint workers by department and zone.'
  }
  const count = workers.value.length
  const workerText = count === 1 ? '1 worker' : `${count} workers`
  return `${workerText} · ${activeCount.value} active`
})

const departmentOptions = computed(() => {
  const set = new Set()
  for (const w of workers.value) {
    const dept = labelOf(w.department)
    if (dept) {
      set.add(dept)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const zoneOptions = computed(() => {
  const set = new Set(DEFAULT_ZONES)
  for (const w of workers.value) {
    const z = labelOf(w.zone)
    if (z) {
      set.add(z)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const zoneGap = computed(() => {
  if (!hasLoaded.value || workers.value.length === 0) return null
  return getPrimaryZoneGap(workers.value, zoneStats.value, DEFAULT_ZONES)
})

const filteredWorkers = computed(() => {
  const searchRaw = filters.search.trim().toLowerCase()
  const searchDigits = filters.search.replace(/\D/g, '')

  return workers.value.filter((w) => {
    if (filters.department !== 'all' && labelOf(w.department) !== filters.department) {
      return false
    }

    if (filters.zone !== 'all' && labelOf(w.zone) !== filters.zone) {
      return false
    }

    if (filters.status === 'active' && !w.is_active) {
      return false
    }
    if (filters.status === 'inactive' && w.is_active) {
      return false
    }

    if (searchRaw) {
      const nameMatch = (w.name || '').toLowerCase().includes(searchRaw)
      const workerDigits = (w.phone || '').replace(/\D/g, '')
      const phoneMatch = searchDigits.length > 0 && workerDigits.includes(searchDigits)

      if (!nameMatch && !phoneMatch) {
        return false
      }
    }

    return true
  })
})

function resetFilters() {
  filters.search = ''
  filters.department = 'all'
  filters.zone = 'all'
  filters.status = 'all'
}

async function loadWorkers() {
  const currentRequestId = ++requestId
  isLoading.value = true
  error.value = ''

  try {
    const [data] = await Promise.all([
      fetchWorkers(),
      fetchStats()
        .then((res) => {
          if (res?.by_zone && Array.isArray(res.by_zone)) {
            zoneStats.value = res.by_zone
          }
        })
        .catch(() => {
          zoneStats.value = []
        }),
    ])
    if (!isMounted || currentRequestId !== requestId) return

    workers.value = data.items
    total.value = data.total
    hasLoaded.value = true
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return

    error.value = getErrorMessage(err)
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

function handleStartDeactivate(id) {
  actionError.value = ''
  confirmingId.value = id
}

async function handleConfirmDeactivate(row) {
  await toggleWorkerActive(row, false)
}

async function handleActivate(row) {
  actionError.value = ''
  confirmingId.value = ''
  await toggleWorkerActive(row, true)
}

async function toggleWorkerActive(row, nextValue) {
  actionError.value = ''
  pendingIds.add(row.id)

  try {
    const updated = await setWorkerActive(row.id, nextValue)
    if (!isMounted) return

    const index = workers.value.findIndex((w) => w.id === row.id)
    if (index !== -1) {
      workers.value[index] = { ...workers.value[index], ...updated }
    }
    confirmingId.value = ''
  } catch (err) {
    if (!isMounted) return
    confirmingId.value = ''
    actionError.value = getErrorMessage(err)
  } finally {
    pendingIds.delete(row.id)
  }
}

onMounted(() => {
  isMounted = true
  loadWorkers()
})

onBeforeUnmount(() => {
  isMounted = false
})

defineExpose({
  loadWorkers,
  workers,
  filters,
  resetFilters,
})
</script>

<template>
  <div class="admin-workers-view">
    <PageHeader title="Workers" :subtitle="subtitle">
      <template #actions>
        <RouterLink :to="{ name: 'admin-worker-new' }" class="btn btn-primary btn-sm ns-btn-gradient">
          Add worker
        </RouterLink>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
          :disabled="isLoading"
          @click="loadWorkers"
        >
          <LoadingSpinner v-if="isLoading" size="sm" label="Refreshing..." />
          <span>Refresh</span>
        </button>
      </template>
    </PageHeader>

    <LoadingSpinner v-if="isLoading && !hasLoaded" centered label="Loading workers..." />

    <template v-else>
      <ErrorAlert
        v-if="error"
        class="mb-4"
        title="Could not load workers"
        :message="error"
        show-retry
        @retry="loadWorkers"
      />

      <!-- Amber Zone Gap Alert Banner -->
      <div
        v-if="zoneGap"
        class="ns-zone-gap-banner mb-4"
        role="alert"
      >
        <div class="ns-zone-gap-banner__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="ns-zone-gap-banner__content">
          <span class="ns-zone-gap-banner__message">{{ zoneGap.message }}</span>
        </div>
      </div>

      <!-- Filters Card: Status Tabs + Search & Dropdowns -->
      <div v-if="hasLoaded && workers.length > 0" class="ns-filter-card mb-4">
        <!-- Status Tabs -->
        <div class="ns-filter-card__tabs mb-3">
          <div class="worker-status-tabs" role="tablist" aria-label="Filter workers by status">
            <button
              type="button"
              role="tab"
              :aria-selected="filters.status === 'all'"
              class="worker-status-tab"
              :class="{ 'worker-status-tab--active': filters.status === 'all' }"
              @click="filters.status = 'all'"
            >
              <span>All</span>
              <span class="worker-status-tab__count">{{ workers.length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="filters.status === 'active'"
              class="worker-status-tab"
              :class="{ 'worker-status-tab--active': filters.status === 'active' }"
              @click="filters.status = 'active'"
            >
              <span>Active</span>
              <span class="worker-status-tab__count">{{ activeCount }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="filters.status === 'inactive'"
              class="worker-status-tab"
              :class="{ 'worker-status-tab--active': filters.status === 'inactive' }"
              @click="filters.status = 'inactive'"
            >
              <span>Inactive</span>
              <span class="worker-status-tab__count">{{ inactiveCount }}</span>
            </button>
          </div>
        </div>

        <!-- Search and Dropdowns -->
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-5">
            <label for="worker-search" class="form-label small fw-semibold text-secondary">Search</label>
            <input
              id="worker-search"
              v-model="filters.search"
              type="search"
              class="form-control form-control-sm ns-filter-input"
              placeholder="Search by name or phone"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <label for="worker-zone" class="form-label small fw-semibold text-secondary">Zone</label>
            <select id="worker-zone" v-model="filters.zone" class="form-select form-select-sm ns-filter-select">
              <option value="all">All zones</option>
              <option v-for="z in zoneOptions" :key="z" :value="z">
                {{ z }}
              </option>
            </select>
          </div>

          <div class="col-12 col-sm-6 col-md-4">
            <label for="worker-department" class="form-label small fw-semibold text-secondary">Department</label>
            <select
              id="worker-department"
              v-model="filters.department"
              class="form-select form-select-sm ns-filter-select"
            >
              <option value="all">All departments</option>
              <option v-for="dept in departmentOptions" :key="dept" :value="dept">
                {{ dept }}
              </option>
            </select>
          </div>

          <!-- Hidden select keeps legacy DOM queries or programmatic setValue working -->
          <select id="worker-status" v-model="filters.status" class="visually-hidden" aria-label="Status filter">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <ErrorAlert
        v-if="actionError"
        class="mb-3"
        title="Could not update worker"
        :message="actionError"
      />

      <EmptyState
        v-if="hasLoaded && !error && workers.length === 0"
        title="No workers yet"
        message="Workers you add will appear here."
      />

      <!-- Main Content Area: Table + Zone Coverage Card -->
      <div v-else-if="hasLoaded && workers.length > 0" class="row g-4 align-items-start">
        <!-- Table Column -->
        <div class="col-12 col-lg-8 col-xl-9">
          <EmptyState
            v-if="filteredWorkers.length === 0"
            title="No workers match your filters"
            message="Try adjusting your search or filter criteria."
          >
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetFilters">
              Clear filters
            </button>
          </EmptyState>

          <div v-else class="ns-table-card">
            <DataTable :columns="columns" :rows="filteredWorkers" row-key="id" variant="admin">
              <template #cell-worker="{ row }">
                <div class="worker-identity">
                  <span class="worker-name fw-semibold d-block">{{ row.name }}</span>
                  <span class="worker-phone text-secondary small">{{ formatPhone(row.phone) }}</span>
                </div>
              </template>

              <template #cell-zone="{ row }">
                <span class="worker-zone fw-medium">{{ labelOf(row.zone) }}</span>
              </template>

              <template #cell-active_tasks="{ row }">
                <span class="worker-active-tasks text-secondary">{{ row.active_tasks ?? '—' }}</span>
              </template>

              <template #cell-is_active="{ row }">
                <span
                  class="worker-status-pill"
                  :class="row.is_active ? 'worker-status-pill--active' : 'worker-status-pill--inactive'"
                >
                  <span class="worker-status-pill__dot" aria-hidden="true"></span>
                  <span>{{ row.is_active ? 'Active' : 'Inactive' }}</span>
                </span>
              </template>

              <template #cell-actions="{ row }">
                <div v-if="confirmingId === row.id" class="d-inline-flex align-items-center flex-wrap gap-2">
                  <span class="small fw-semibold text-danger">Deactivate this worker?</span>
                  <button
                    type="button"
                    class="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                    :disabled="pendingIds.has(row.id)"
                    @click="handleConfirmDeactivate(row)"
                  >
                    <LoadingSpinner v-if="pendingIds.has(row.id)" size="sm" label="Updating..." />
                    <span>Yes, deactivate</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-light btn-sm"
                    :disabled="pendingIds.has(row.id)"
                    @click="confirmingId = ''"
                  >
                    Cancel
                  </button>
                </div>

                <div v-else class="d-inline-flex align-items-center gap-1">
                  <button
                    v-if="row.is_active"
                    type="button"
                    class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    :aria-label="`Deactivate ${row.name}`"
                    :disabled="pendingIds.has(row.id)"
                    @click="handleStartDeactivate(row.id)"
                  >
                    <LoadingSpinner v-if="pendingIds.has(row.id)" size="sm" label="Updating..." />
                    <span>Deactivate</span>
                  </button>

                  <button
                    v-else
                    type="button"
                    class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                    :aria-label="`Activate ${row.name}`"
                    :disabled="pendingIds.has(row.id)"
                    @click="handleActivate(row)"
                  >
                    <LoadingSpinner v-if="pendingIds.has(row.id)" size="sm" label="Updating..." />
                    <span>Activate</span>
                  </button>
                </div>
              </template>
            </DataTable>
          </div>
        </div>

        <!-- Zone Coverage Card Column -->
        <div class="col-12 col-lg-4 col-xl-3">
          <div class="ns-coverage-card">
            <div class="ns-coverage-card__header mb-3">
              <h2 class="ns-coverage-card__title mb-1">Zone coverage</h2>
              <p class="ns-coverage-card__subtitle text-secondary small mb-0">Active staff per zone</p>
            </div>

            <div class="ns-coverage-list" role="list">
              <div
                v-for="item in zoneCoverage"
                :key="item.zone"
                class="ns-coverage-item"
                role="listitem"
              >
                <div class="ns-coverage-item__zone">
                  <span class="ns-coverage-item__name">{{ item.zone }}</span>
                </div>
                <div class="ns-coverage-item__status">
                  <span
                    v-if="item.hasActiveWorker"
                    class="zone-coverage-count-pill"
                  >
                    {{ item.activeWorkers }} active
                  </span>
                  <span
                    v-else
                    class="zone-coverage-none-pill"
                  >
                    No worker
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-workers-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ns-btn-gradient {
  background: linear-gradient(135deg, #0B7285, #0E4F6B) !important;
  color: #FFFFFF !important;
  border: none !important;
  font-weight: 600;
  border-radius: 12px;
  height: 38px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.2);
  transition: all 150ms ease;
  text-decoration: none;
}

.ns-btn-gradient:hover {
  background: linear-gradient(135deg, #0E4F6B, #093E54) !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 12px rgba(11, 114, 133, 0.3);
}

.ns-zone-gap-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background-color: var(--ns-alert-amber-bg, #FEF3C7);
  color: var(--ns-alert-amber-fg, #92400E);
  border: 1px solid var(--ns-alert-amber-border, #FDE68A);
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
}

.ns-zone-gap-banner__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ns-zone-gap-banner__message {
  font-weight: 600;
}

.ns-filter-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 20px 24px;
}

.worker-status-tabs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.worker-status-tab {
  height: 40px;
  min-height: 40px;
  min-width: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
}

.worker-status-tab:hover:not(.worker-status-tab--active) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
  color: #0E2233;
}

.worker-status-tab--active {
  background-color: #0B7285;
  border-color: #0B7285;
  color: #FFFFFF;
}

.worker-status-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background-color: #D8F1F3;
  color: #0B6A7C;
}

.worker-status-tab--active .worker-status-tab__count {
  background-color: rgba(255, 255, 255, 0.25);
  color: #FFFFFF;
}

.ns-filter-input,
.ns-filter-select {
  border: 1.5px solid #D5DEE7;
  border-radius: 10px;
  font-size: 14px;
  color: #0E2233;
  padding: 8px 12px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.ns-filter-input:focus,
.ns-filter-select:focus {
  border-color: #0B7285;
  outline: 2px solid rgba(11, 114, 133, 0.25);
  outline-offset: 1px;
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .ns-btn-gradient,
  .worker-status-tab,
  .ns-filter-input,
  .ns-filter-select {
    transition: none;
  }
}

.worker-phone {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ns-table-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  overflow: hidden;
}

.worker-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.worker-name {
  font-weight: 600;
  color: #0E2233;
}

.worker-zone,
.worker-active-tasks {
  font-weight: 500;
}

.ns-coverage-card {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 24px;
}

.ns-coverage-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 16px;
  font-weight: 700;
  color: #0E2233;
}

.ns-coverage-list {
  display: flex;
  flex-direction: column;
}

.ns-coverage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F1F5F9;
}

.ns-coverage-item:last-child {
  border-bottom: none;
}

.ns-coverage-item__name {
  font-weight: 600;
  font-size: 14px;
  color: #0E2233;
}

.zone-coverage-count-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background-color: #D8F1F3;
  color: #0B6A7C;
}

.zone-coverage-none-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background-color: var(--ns-pill-red-bg, #FEE2E2);
  color: var(--ns-pill-red-fg, #B91C1C);
}

.worker-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--ns-radius-pill);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
}

.worker-status-pill--active {
  background-color: var(--ns-success-bg);
  color: var(--ns-success-fg);
}

.worker-status-pill--inactive {
  background-color: var(--ns-neutral-bg);
  color: var(--ns-neutral-fg);
}

.worker-status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}
</style>
