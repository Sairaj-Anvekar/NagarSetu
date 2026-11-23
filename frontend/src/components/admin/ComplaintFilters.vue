<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import StatusTabs from './StatusTabs.vue'

const props = defineProps({
  filters: {
    type: Object,
    default: () => ({
      q: '',
      status: '',
      category: '',
      zoneId: '',
      overdue: false,
      unassigned: false,
    }),
  },
  categories: {
    type: Array,
    default: () => [],
  },
  zones: {
    type: Array,
    default: () => [],
  },
  counts: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update'])

const searchInput = ref(props.filters?.q || '')
let searchTimer = null

watch(
  () => props.filters?.q,
  (newVal) => {
    if ((newVal || '') !== searchInput.value) {
      searchInput.value = newVal || ''
    }
  },
)

const normalizedCategories = computed(() => {
  return props.categories.map((c) => (typeof c === 'string' ? c : c?.category)).filter(Boolean)
})

const normalizedZones = computed(() => {
  return props.zones.map((z) => {
    if (typeof z === 'string') return { id: z, name: z }
    return { id: String(z?.id ?? ''), name: z?.name ?? '' }
  })
})

const hasActiveFilters = computed(() => {
  const f = props.filters || {}
  return Boolean(
    (typeof searchInput.value === 'string' && searchInput.value.trim() !== '') ||
      (typeof f.q === 'string' && f.q.trim() !== '') ||
      (f.status && f.status !== '') ||
      (f.category && f.category !== '') ||
      (f.zoneId !== undefined && f.zoneId !== null && f.zoneId !== '') ||
      f.overdue === true ||
      f.unassigned === true,
  )
})

function updateFilter(key, value) {
  emit('update', {
    ...props.filters,
    [key]: value,
  })
}

function clearSearchTimer() {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
}

function triggerSearch(immediate = false) {
  clearSearchTimer()
  if (immediate) {
    updateFilter('q', searchInput.value)
  } else {
    searchTimer = setTimeout(() => {
      updateFilter('q', searchInput.value)
    }, 300)
  }
}

function handleSearchInput(e) {
  searchInput.value = (e.target.value || '').slice(0, 100)
  triggerSearch(false)
}

function handleSearchKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    triggerSearch(true)
  }
}

function handleStatusChange(e) {
  updateFilter('status', e.target.value)
}

function handleCategoryChange(e) {
  updateFilter('category', e.target.value)
}

function handleZoneChange(e) {
  updateFilter('zoneId', e.target.value)
}

function handleOverdueChange(e) {
  updateFilter('overdue', e.target.checked)
}

function handleUnassignedChange(e) {
  updateFilter('unassigned', e.target.checked)
}

function clearAllFilters() {
  clearSearchTimer()
  searchInput.value = ''
  emit('update', {
    q: '',
    status: '',
    category: '',
    zoneId: '',
    overdue: false,
    unassigned: false,
  })
}

onBeforeUnmount(() => {
  clearSearchTimer()
})
</script>

<template>
  <div class="ns-complaint-filters">
    <!-- Top Row: Status Tabs & Overdue Switch -->
    <div class="ns-filter-row-top">
      <div class="ns-status-tabs-container">
        <!-- Hidden select kept for accessible form fallbacks and test compatibility -->
        <label for="complaint-filter-status" class="visually-hidden">Status</label>
        <select
          id="complaint-filter-status"
          class="visually-hidden"
          :value="filters.status || ''"
          aria-hidden="true"
          tabindex="-1"
          @change="handleStatusChange"
        >
          <option value="">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="In-Progress">In-Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <StatusTabs
          :model-value="filters.status || ''"
          :counts="counts"
          @update:model-value="(val) => updateFilter('status', val)"
        />
      </div>

      <div class="ns-overdue-switch-wrap">
        <div class="form-check form-switch ns-overdue-switch">
          <input
            id="complaint-filter-overdue"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="filters.overdue === true"
            @change="handleOverdueChange"
          />
          <label class="form-check-label" for="complaint-filter-overdue">
            Overdue only
          </label>
        </div>
      </div>
    </div>

    <!-- Second Row: Search & Dropdowns -->
    <div class="ns-filter-row-bottom">
      <div class="row g-3 align-items-end">
        <!-- Search -->
        <div class="col-12 col-md-5 col-lg-4">
          <label for="complaint-filter-search" class="form-label ns-filter-label">Search</label>
          <div class="ns-search-input-wrapper">
            <svg
              class="ns-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="complaint-filter-search"
              :value="searchInput"
              type="search"
              class="form-control ns-filter-control ns-search-control"
              placeholder="Tracking code or text"
              maxlength="100"
              @input="handleSearchInput"
              @keydown="handleSearchKeydown"
            />
          </div>
        </div>

        <!-- Category -->
        <div class="col-12 col-sm-6 col-md-3 col-lg-3">
          <label for="complaint-filter-category" class="form-label ns-filter-label">Category</label>
          <select
            id="complaint-filter-category"
            :value="filters.category || ''"
            class="form-select ns-filter-control"
            @change="handleCategoryChange"
          >
            <option value="">All categories</option>
            <option v-for="cat in normalizedCategories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>

        <!-- Zone -->
        <div class="col-12 col-sm-6 col-md-3 col-lg-2">
          <label for="complaint-filter-zone" class="form-label ns-filter-label">Zone</label>
          <select
            id="complaint-filter-zone"
            :value="filters.zoneId || ''"
            class="form-select ns-filter-control"
            @change="handleZoneChange"
          >
            <option value="">All zones</option>
            <option v-for="z in normalizedZones" :key="z.id" :value="z.id">
              {{ z.name }}
            </option>
          </select>
        </div>

        <!-- Unassigned & Clear -->
        <div class="col-12 col-md d-flex flex-wrap align-items-center justify-content-md-end gap-3 pt-1 pt-md-0">
          <div class="form-check ns-filter-check">
            <input
              id="complaint-filter-unassigned"
              class="form-check-input"
              type="checkbox"
              :checked="filters.unassigned === true"
              @change="handleUnassignedChange"
            />
            <label class="form-check-label" for="complaint-filter-unassigned">
              Unassigned only
            </label>
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-link ns-clear-btn"
            @click="clearAllFilters"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-complaint-filters {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ns-filter-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 4px;
}

.ns-status-tabs-container {
  display: flex;
  align-items: center;
}

.ns-overdue-switch-wrap {
  display: inline-flex;
  align-items: center;
}

.ns-overdue-switch {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 0;
  padding-left: 3rem;
  cursor: pointer;
}

.ns-overdue-switch .form-check-input {
  width: 2.25rem;
  height: 1.25rem;
  margin-left: -3rem;
  margin-top: 0;
  border: 1.5px solid #CBD5E1;
  background-color: #EEF3F7;
  cursor: pointer;
  transition: all 150ms ease;
}

.ns-overdue-switch .form-check-input:checked {
  background-color: #0B7285;
  border-color: #0B7285;
}

.ns-overdue-switch .form-check-input:focus {
  border-color: #0B7285;
  box-shadow: 0 0 0 3px rgba(11, 114, 133, 0.16);
}

.ns-overdue-switch .form-check-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  user-select: none;
}

.ns-filter-row-bottom {
  width: 100%;
}

.ns-filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #4B5B6B;
  margin-bottom: 6px;
  display: block;
}

.ns-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.ns-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #7A8896;
  pointer-events: none;
}

.ns-search-control {
  padding-left: 38px;
}

.ns-filter-control {
  height: 46px;
  min-height: 46px;
  border-radius: 12px;
  border: 1.5px solid #D5DEE7;
  color: #0E2233;
  background-color: #FFFFFF;
  font-size: 14px;
  padding: 0 14px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.ns-filter-control:focus {
  border-color: #0B7285;
  box-shadow: 0 0 0 3px rgba(11, 114, 133, 0.15);
  outline: none;
}

.ns-filter-check {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  margin-bottom: 0;
  padding-left: 1.75rem;
  cursor: pointer;
}

.ns-filter-check .form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0;
  margin-left: -1.75rem;
  border: 1.5px solid #CBD5E1;
  border-radius: 4px;
  cursor: pointer;
}

.ns-filter-check .form-check-input:checked {
  background-color: #0B7285;
  border-color: #0B7285;
}

.ns-filter-check .form-check-input:focus {
  border-color: #0B7285;
  box-shadow: 0 0 0 3px rgba(11, 114, 133, 0.15);
}

.ns-filter-check .form-check-label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  user-select: none;
}

.ns-clear-btn {
  min-height: 44px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #0B5C70;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  cursor: pointer;
}

.ns-clear-btn:hover {
  color: #0E4F6B;
  text-decoration: underline;
}

.ns-clear-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .ns-filter-control,
  .ns-overdue-switch .form-check-input {
    transition: none;
  }
}
</style>
