<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import HotspotMap from '../components/admin/HotspotMap.vue'
import HotspotList from '../components/admin/HotspotList.vue'
import { fetchHotspots, fetchStats } from '../api/adminApi'
import { getErrorMessage } from '../utils/apiError'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const error = ref('')
const hotspots = ref([])
const selectedHotspotId = ref('')

function handleHotspotSelect(id) {
  selectedHotspotId.value = id !== undefined && id !== null ? String(id) : ''
}

function parseQuery(query = {}) {
  const parsedDays = parseInt(query?.days, 10)
  const validDays = [7, 14, 30].includes(parsedDays) ? parsedDays : 30
  const category = typeof query?.category === 'string' ? query.category.trim() : ''
  return {
    days: validDays,
    category,
  }
}

function buildQuery(days, category) {
  const query = {}
  if (days !== 30 && [7, 14, 30].includes(days)) {
    query.days = String(days)
  }
  if (typeof category === 'string' && category.trim() !== '') {
    query.category = category.trim()
  }
  return query
}

function areQueriesEqual(q1, q2) {
  const keys1 = Object.keys(q1 || {})
  const keys2 = Object.keys(q2 || {})
  if (keys1.length !== keys2.length) return false
  return keys1.every((k) => String(q1[k]) === String(q2[k]))
}

const initialParams = parseQuery(route?.query)
const selectedDays = ref(initialParams.days)
const selectedCategory = ref(initialParams.category)
const categories = ref([])

async function loadCategories() {
  try {
    const statsData = await fetchStats()
    if (Array.isArray(statsData?.by_category)) {
      categories.value = statsData.by_category
        .map((c) => c.category)
        .filter((cat) => typeof cat === 'string' && cat.trim() !== '')
    }
  } catch {
    categories.value = []
  }
}

async function loadHotspots() {
  isLoading.value = true
  error.value = ''

  try {
    const result = await fetchHotspots({
      days: selectedDays.value,
      category: selectedCategory.value,
    })
    hotspots.value = result.items || []
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to load complaint hotspots.')
  } finally {
    isLoading.value = false
  }
}

function syncUrlQuery() {
  const nextQuery = buildQuery(selectedDays.value, selectedCategory.value)
  const currentQuery = route?.query || {}
  if (!areQueriesEqual(nextQuery, currentQuery) && router?.replace) {
    router.replace({ query: nextQuery })
  }
}

function handleDaysChange(days) {
  if (selectedDays.value === days) {
    return
  }
  selectedDays.value = days
  syncUrlQuery()
  loadHotspots()
}

function handleCategoryChange(category) {
  if (selectedCategory.value === category) {
    return
  }
  selectedCategory.value = category
  syncUrlQuery()
  loadHotspots()
}

watch(
  () => route?.query,
  (newQuery) => {
    if (!newQuery) return
    const parsed = parseQuery(newQuery)
    if (selectedDays.value !== parsed.days || selectedCategory.value !== parsed.category) {
      selectedDays.value = parsed.days
      selectedCategory.value = parsed.category
      loadHotspots()
    }
  }
)

onMounted(() => {
  loadCategories()
  loadHotspots()
})
</script>

<template>
  <div class="admin-hotspots">
    <PageHeader
      title="Hotspots"
      subtitle="Areas with repeated complaints, ranked by volume"
    />

    <section class="admin-hotspots__filters" aria-label="Hotspots filters">
      <div class="admin-hotspots__filter-group">
        <span class="admin-hotspots__filter-label">Time range:</span>
        <div class="btn-group" role="group" aria-label="Select days range">
          <button
            v-for="d in [7, 14, 30]"
            :key="d"
            type="button"
            class="btn btn-sm days-btn"
            :class="selectedDays === d ? 'btn-primary' : 'btn-outline-secondary'"
            :aria-pressed="selectedDays === d ? 'true' : 'false'"
            @click="handleDaysChange(d)"
          >
            {{ d }} days
          </button>
        </div>
      </div>

      <div class="admin-hotspots__filter-group">
        <label for="hotspots-category-select" class="admin-hotspots__filter-label">
          Category:
        </label>
        <select
          id="hotspots-category-select"
          class="form-select form-select-sm category-select"
          :value="selectedCategory"
          @change="handleCategoryChange($event.target.value)"
        >
          <option value="">All categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
    </section>

    <div v-if="isLoading" class="admin-hotspots__state-card admin-hotspots__loading">
      <LoadingSpinner label="Loading hotspots..." centered />
    </div>

    <div v-else-if="error" class="admin-hotspots__state-card admin-hotspots__error">
      <ErrorAlert
        :message="error"
        :show-retry="true"
        @retry="loadHotspots"
      />
    </div>

    <div v-else-if="hotspots.length === 0" class="admin-hotspots__state-card admin-hotspots__empty">
      <EmptyState
        title="No hotspots found"
        message="No complaint clusters match the selected criteria."
      />
    </div>

    <div v-else class="admin-hotspots__content">
      <div class="row g-4">
        <div class="col-12 col-lg-7 col-xl-8">
          <HotspotMap
            :hotspots="hotspots"
            :selected-hotspot-id="selectedHotspotId"
            @select="handleHotspotSelect"
          />
        </div>
        <div class="col-12 col-lg-5 col-xl-4">
          <HotspotList
            :hotspots="hotspots"
            :selected-hotspot-id="selectedHotspotId"
            @select="handleHotspotSelect"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-hotspots {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-hotspots__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background-color: var(--ns-paper, #FFFFFF);
  border: 1px solid var(--ns-hotspot-card-border, #E3EAF0);
  border-radius: var(--ns-hotspot-card-radius, 18px);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
}

.admin-hotspots__filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.admin-hotspots__filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ns-slate, #5B6B7A);
  white-space: nowrap;
}

.days-btn {
  height: 38px;
  min-height: 38px;
  min-width: 72px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
  user-select: none;
}

.days-btn.btn-primary {
  background: linear-gradient(
    135deg,
    var(--ns-hotspot-teal-primary, #0B7285),
    var(--ns-hotspot-teal-dark, #0E4F6B)
  ) !important;
  border-color: var(--ns-hotspot-teal-primary, #0B7285) !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.25);
}

.days-btn.btn-outline-secondary {
  background-color: #FFFFFF;
  border-color: var(--ns-hotspot-field-border, #D5DEE7);
  color: #334155;
}

.days-btn.btn-outline-secondary:hover {
  background-color: var(--ns-hotspot-list-hover, #F8FAFC);
  border-color: #CBD5E1;
  color: #0E2233;
}

.category-select {
  height: 40px;
  min-height: 40px;
  min-width: 200px;
  border: 1.5px solid var(--ns-hotspot-field-border, #D5DEE7);
  border-radius: 10px;
  font-size: 0.875rem;
  color: #0E2233;
  padding: 8px 12px;
  background-color: #FFFFFF;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.category-select:focus {
  border-color: var(--ns-hotspot-teal-primary, #0B7285);
  outline: 2px solid rgba(11, 114, 133, 0.25);
  outline-offset: 1px;
  box-shadow: none;
}

.admin-hotspots__state-card {
  background-color: var(--ns-paper, #FFFFFF);
  border: 1px solid var(--ns-hotspot-card-border, #E3EAF0);
  border-radius: var(--ns-hotspot-card-radius, 18px);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 3rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-hotspots__loading,
.admin-hotspots__error,
.admin-hotspots__empty {
  width: 100%;
}

.admin-hotspots__error :deep(.alert) {
  margin-bottom: 0;
  width: 100%;
  max-width: 600px;
}

.admin-hotspots__content {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .days-btn,
  .category-select {
    transition: none;
  }
}
</style>
