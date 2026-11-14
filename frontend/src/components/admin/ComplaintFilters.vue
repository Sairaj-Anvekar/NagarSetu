<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

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
    <div class="row g-3 align-items-end">
      <!-- Search -->
      <div class="col-12 col-md-4 col-lg-3">
        <label for="complaint-filter-search" class="form-label ns-filter-label">Search</label>
        <input
          id="complaint-filter-search"
          :value="searchInput"
          type="search"
          class="form-control ns-filter-control"
          placeholder="Tracking code or text"
          maxlength="100"
          @input="handleSearchInput"
          @keydown="handleSearchKeydown"
        />
      </div>

      <!-- Status -->
      <div class="col-12 col-sm-6 col-md-3 col-lg-2">
        <label for="complaint-filter-status" class="form-label ns-filter-label">Status</label>
        <select
          id="complaint-filter-status"
          :value="filters.status || ''"
          class="form-select ns-filter-control"
          @change="handleStatusChange"
        >
          <option value="">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="In-Progress">In-Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <!-- Category -->
      <div class="col-12 col-sm-6 col-md-3 col-lg-2">
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
      <div class="col-12 col-sm-6 col-md-2 col-lg-2">
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

      <!-- Checkboxes & Clear -->
      <div class="col-12 col-md-auto d-flex flex-wrap align-items-center gap-3">
        <div class="form-check ns-filter-check">
          <input
            id="complaint-filter-overdue"
            class="form-check-input"
            type="checkbox"
            :checked="filters.overdue === true"
            @change="handleOverdueChange"
          />
          <label class="form-check-label" for="complaint-filter-overdue">
            Overdue only
          </label>
        </div>

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
          class="btn btn-outline-secondary ns-clear-btn"
          @click="clearAllFilters"
        >
          Clear filters
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-complaint-filters {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.ns-filter-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-ink);
  margin-bottom: 0.375rem;
}

.ns-filter-control {
  min-height: 44px;
  border-radius: var(--ns-radius-control);
  border: 1px solid var(--ns-line);
  color: var(--ns-ink);
  background-color: var(--ns-paper);
  font-size: 0.875rem;
}

.ns-filter-control:focus {
  border-color: var(--ns-harbour);
  box-shadow: 0 0 0 3px rgba(11, 110, 153, 0.15);
  outline: none;
}

.ns-filter-check {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  margin-bottom: 0;
  padding-left: 1.75rem;
}

.ns-filter-check .form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0;
  margin-left: -1.75rem;
  border: 1px solid var(--ns-line);
  border-radius: 4px;
  cursor: pointer;
}

.ns-filter-check .form-check-input:checked {
  background-color: var(--ns-harbour);
  border-color: var(--ns-harbour);
}

.ns-filter-check .form-check-input:focus {
  border-color: var(--ns-harbour);
  box-shadow: 0 0 0 3px rgba(11, 110, 153, 0.15);
}

.ns-filter-check .form-check-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-ink);
  cursor: pointer;
}

.ns-clear-btn {
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: var(--ns-radius-control);
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.ns-clear-btn:focus-visible {
  outline: 2px solid var(--ns-harbour);
  outline-offset: 2px;
}
</style>
