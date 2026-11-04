<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppCard from '../components/AppCard.vue'
import DataTable from '../components/DataTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import { fetchWorkers, setWorkerActive } from '../api/workersApi'
import { getErrorMessage } from '../utils/apiError'
import { formatPhone } from '../utils/formatPhone'

const workers = ref([])
const total = ref(0)
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
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'department', label: 'Department' },
  { key: 'zone', label: 'Zone' },
  { key: 'is_active', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

const subtitle = computed(() => {
  if (!hasLoaded.value) {
    return 'Complaint workers by department and zone.'
  }
  const count = workers.value.length
  const workerText = count === 1 ? '1 worker' : `${count} workers`
  const activeCount = workers.value.filter((w) => w.is_active).length
  return `${workerText} · ${activeCount} active`
})

const departmentOptions = computed(() => {
  const set = new Set()
  for (const w of workers.value) {
    if (w.department && typeof w.department === 'string' && w.department.trim()) {
      set.add(w.department.trim())
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const zoneOptions = computed(() => {
  const set = new Set()
  for (const w of workers.value) {
    if (w.zone && typeof w.zone === 'string' && w.zone.trim()) {
      set.add(w.zone.trim())
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const filteredWorkers = computed(() => {
  const searchRaw = filters.search.trim().toLowerCase()
  const searchDigits = filters.search.replace(/\D/g, '')

  return workers.value.filter((w) => {
    if (filters.department !== 'all' && w.department !== filters.department) {
      return false
    }

    if (filters.zone !== 'all' && w.zone !== filters.zone) {
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
    const data = await fetchWorkers()
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

      <AppCard v-if="hasLoaded && workers.length > 0" class="mb-4">
        <div class="row g-3">
          <div class="col-12 col-md-3">
            <label for="worker-search" class="form-label small fw-semibold">Search</label>
            <input
              id="worker-search"
              v-model="filters.search"
              type="search"
              class="form-control form-control-sm"
              placeholder="Name or phone"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <label for="worker-department" class="form-label small fw-semibold">Department</label>
            <select
              id="worker-department"
              v-model="filters.department"
              class="form-select form-select-sm"
            >
              <option value="all">All departments</option>
              <option v-for="dept in departmentOptions" :key="dept" :value="dept">
                {{ dept }}
              </option>
            </select>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <label for="worker-zone" class="form-label small fw-semibold">Zone</label>
            <select id="worker-zone" v-model="filters.zone" class="form-select form-select-sm">
              <option value="all">All zones</option>
              <option v-for="z in zoneOptions" :key="z" :value="z">
                {{ z }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-3">
            <label for="worker-status" class="form-label small fw-semibold">Status</label>
            <select id="worker-status" v-model="filters.status" class="form-select form-select-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </AppCard>

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

      <EmptyState
        v-else-if="hasLoaded && !error && workers.length > 0 && filteredWorkers.length === 0"
        title="No workers match your filters"
        message="Try adjusting your search or filter criteria."
      >
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetFilters">
          Clear filters
        </button>
      </EmptyState>

      <div v-else-if="filteredWorkers.length > 0" class="table-responsive">
        <DataTable :columns="columns" :rows="filteredWorkers" row-key="id">
          <template #cell-name="{ row }">
            <span class="fw-semibold">{{ row.name }}</span>
          </template>

          <template #cell-phone="{ row }">
            <span class="worker-phone">{{ formatPhone(row.phone) }}</span>
          </template>

          <template #cell-department="{ row }">
            {{ row.department }}
          </template>

          <template #cell-zone="{ row }">
            {{ row.zone }}
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
    </template>
  </div>
</template>

<style scoped>
.worker-phone {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
