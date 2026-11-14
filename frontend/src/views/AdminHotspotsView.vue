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
      subtitle="Geographic clustering of department grievances"
    />

    <div class="admin-hotspots__filters">
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
    </div>

    <div v-if="isLoading" class="admin-hotspots__loading">
      <LoadingSpinner label="Loading hotspots..." centered />
    </div>

    <div v-else-if="error" class="admin-hotspots__error">
      <ErrorAlert
        :message="error"
        :show-retry="true"
        @retry="loadHotspots"
      />
    </div>

    <div v-else-if="hotspots.length === 0" class="admin-hotspots__empty">
      <EmptyState
        title="No hotspots found"
        message="No complaint clusters match the selected criteria."
      />
    </div>

    <div v-else class="admin-hotspots__content">
      <div class="row g-4">
        <div class="col-12 col-lg-7 col-xl-8">
          <HotspotMap :hotspots="hotspots" />
        </div>
        <div class="col-12 col-lg-5 col-xl-4">
          <HotspotList :hotspots="hotspots" />
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
  gap: 1rem;
  padding: 1rem 1.25rem;
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
}

.admin-hotspots__filter-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.admin-hotspots__filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-slate);
  white-space: nowrap;
}

.days-btn {
  min-height: 38px;
  min-width: 68px;
  font-weight: 600;
}

.category-select {
  min-height: 38px;
  min-width: 180px;
}

.admin-hotspots__loading,
.admin-hotspots__error,
.admin-hotspots__empty {
  padding: 1.5rem 0;
}

.admin-hotspots__content {
  width: 100%;
}
</style>
