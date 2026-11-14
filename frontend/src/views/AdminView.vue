<script setup>
import { onMounted, ref } from 'vue'
import { fetchStats, fetchTrends } from '../api/adminApi'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import AppCard from '../components/AppCard.vue'
import StatTile from '../components/admin/StatTile.vue'
import CategoryChart from '../components/admin/CategoryChart.vue'
import ZoneBreakdown from '../components/admin/ZoneBreakdown.vue'
import TrendChart from '../components/admin/TrendChart.vue'

// Stats state
const statsLoading = ref(true)
const statsError = ref(null)
const stats = ref(null)

// Trends state
const trendsLoading = ref(true)
const trendsError = ref(null)
const trends = ref([])
const trendDays = ref(14)

async function loadStats() {
  statsLoading.value = true
  statsError.value = null
  try {
    stats.value = await fetchStats()
  } catch (err) {
    statsError.value = err?.message || 'Failed to load department statistics.'
  } finally {
    statsLoading.value = false
  }
}

async function loadTrends(days = trendDays.value) {
  trendsLoading.value = true
  trendsError.value = null
  try {
    trends.value = await fetchTrends({ days })
  } catch (err) {
    trendsError.value = err?.message || 'Failed to load grievance volume trends.'
  } finally {
    trendsLoading.value = false
  }
}

function handleRefresh() {
  loadStats()
  loadTrends(trendDays.value)
}

function setTrendRange(days) {
  trendDays.value = days
  loadTrends(days)
}

defineExpose({
  loadStats,
  loadTrends,
  handleRefresh,
  setTrendRange,
  stats,
  trends,
})

onMounted(() => {
  loadStats()
  loadTrends(trendDays.value)
})
</script>

<template>
  <div class="admin-dashboard">
    <PageHeader title="Dashboard" :subtitle="stats?.department?.name || ''">
      <template #actions>
        <button
          type="button"
          class="btn btn-outline-secondary d-inline-flex align-items-center gap-2 refresh-btn"
          :disabled="statsLoading || trendsLoading"
          aria-label="Refresh dashboard metrics"
          @click="handleRefresh"
        >
          <svg
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
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span>Refresh</span>
        </button>
      </template>
    </PageHeader>

    <LoadingSpinner v-if="statsLoading" centered label="Loading dashboard metrics..." />

    <ErrorAlert
      v-else-if="statsError"
      title="Unable to load statistics"
      :message="statsError"
      show-retry
      @retry="loadStats"
    />

    <div v-else-if="stats" class="admin-dashboard__content">
      <div class="row g-3 admin-dashboard__tiles mb-4">
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="Total" :value="stats.totals.total" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="Submitted" :value="stats.totals.submitted" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="In-Progress" :value="stats.totals.in_progress" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="Completed" :value="stats.totals.completed" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="Overdue" :value="stats.totals.overdue" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <StatTile label="Unassigned" :value="stats.totals.unassigned" />
        </div>
      </div>

      <div v-if="stats.totals.total === 0" class="admin-dashboard__empty mb-4">
        <EmptyState
          title="No complaints yet"
          message="When citizens submit complaints to this department, category and zone breakdowns will appear here."
        />
      </div>

      <template v-else>
        <div class="row g-4 mb-4">
          <div class="col-12 col-lg-7">
            <AppCard title="Complaints by Category">
              <CategoryChart :categories="stats.by_category" />
            </AppCard>
          </div>
          <div class="col-12 col-lg-5">
            <AppCard title="Complaints by Zone">
              <ZoneBreakdown :zones="stats.by_zone" />
            </AppCard>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-12">
            <AppCard title="Complaint Trends">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <span class="text-muted small">Daily volume of created and completed complaints</span>
                <div class="btn-group" role="group" aria-label="Trend duration range">
                  <button
                    type="button"
                    class="btn btn-sm range-btn"
                    :class="trendDays === 7 ? 'btn-primary' : 'btn-outline-secondary'"
                    :aria-pressed="trendDays === 7 ? 'true' : 'false'"
                    @click="setTrendRange(7)"
                  >
                    7 days
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm range-btn"
                    :class="trendDays === 14 ? 'btn-primary' : 'btn-outline-secondary'"
                    :aria-pressed="trendDays === 14 ? 'true' : 'false'"
                    @click="setTrendRange(14)"
                  >
                    14 days
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm range-btn"
                    :class="trendDays === 30 ? 'btn-primary' : 'btn-outline-secondary'"
                    :aria-pressed="trendDays === 30 ? 'true' : 'false'"
                    @click="setTrendRange(30)"
                  >
                    30 days
                  </button>
                </div>
              </div>

              <LoadingSpinner
                v-if="trendsLoading"
                centered
                label="Loading grievance volume trends..."
              />
              <ErrorAlert
                v-else-if="trendsError"
                title="Unable to load trends"
                :message="trendsError"
                show-retry
                @retry="() => loadTrends(trendDays)"
              />
              <TrendChart v-else :trends="trends" />
            </AppCard>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  width: 100%;
}

.refresh-btn {
  min-height: 44px;
  min-width: 44px;
}

.range-btn {
  min-height: 44px;
  min-width: 64px;
}

.admin-dashboard__empty {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  padding: 1.5rem;
}
</style>
