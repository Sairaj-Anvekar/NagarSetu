<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchStats, fetchTrends } from '../api/adminApi'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import AppCard from '../components/AppCard.vue'
import StatTile from '../components/admin/StatTile.vue'
import AttentionStrip from '../components/admin/AttentionStrip.vue'
import CategoryChart from '../components/admin/CategoryChart.vue'
import ZoneBreakdown from '../components/admin/ZoneBreakdown.vue'
import TrendChart from '../components/admin/TrendChart.vue'

// Stats state
const statsLoading = ref(true)
const statsError = ref(null)
const stats = ref(null)
const tiles = computed(() => {
  const totals = stats.value?.totals
  if (!totals) return []
  const percentage = (count) => totals.total > 0
    ? `${Math.round((count / totals.total) * 100)}% of total` : ''
  return [
    { label: 'Total', key: 'total', icon: 'dashboard', tone: 'total', query: {}, hint: '' },
    { label: 'Submitted', key: 'submitted', icon: 'tasks', tone: 'submitted',
      query: { status: 'Submitted' }, hint: percentage(totals.submitted) },
    { label: 'In-Progress', key: 'in_progress', icon: 'clock', tone: 'in-progress',
      query: { status: 'In-Progress' }, hint: percentage(totals.in_progress) },
    { label: 'Completed', key: 'completed', icon: 'history', tone: 'completed',
      query: { status: 'Completed' }, hint: percentage(totals.completed) },
    { label: 'Overdue', key: 'overdue', icon: 'clock', tone: 'overdue',
      query: { overdue: 'true' }, attention: totals.overdue > 0,
      hint: totals.overdue > 0 ? 'Needs attention' : 'All clear' },
    { label: 'Unassigned', key: 'unassigned', icon: 'users', tone: 'unassigned',
      query: { unassigned: 'true' }, attention: totals.unassigned > 0,
      hint: totals.unassigned > 0 ? 'Needs attention' : 'All clear' },
  ]
})

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

    <div v-if="statsLoading" class="admin-dashboard__state">
      <LoadingSpinner centered label="Loading dashboard metrics..." />
    </div>

    <div v-else-if="statsError" class="admin-dashboard__state">
      <ErrorAlert
      title="Unable to load statistics"
      :message="statsError"
      show-retry
      @retry="loadStats"
      />
    </div>

    <div v-else-if="stats" class="admin-dashboard__content">
      <AttentionStrip :overdue="stats.totals.overdue" :unassigned="stats.totals.unassigned" />
      <div class="row g-3 admin-dashboard__tiles mb-4">
        <div v-for="tile in tiles" :key="tile.key" class="col-6 col-md-4 col-xl-2">
          <StatTile
            :label="tile.label" :value="stats.totals[tile.key]"
            :icon="tile.icon" :tone="tile.tone" :hint="tile.hint"
            :attention="tile.attention"
            :to="{ path: '/admin/complaints', query: tile.query }"
          />
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
            <AppCard title="Complaints by Category" class="admin-dashboard__chart-card h-100">
              <p class="text-secondary small mb-4">Complaint volume across service categories</p>
              <CategoryChart :categories="stats.by_category" />
            </AppCard>
          </div>
          <div class="col-12 col-lg-5">
            <AppCard title="Complaints by Zone" class="admin-dashboard__chart-card h-100">
              <p class="text-secondary small mb-4">Distribution across department zones</p>
              <ZoneBreakdown :zones="stats.by_zone" />
            </AppCard>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-12">
            <AppCard title="Complaint Trends" class="admin-dashboard__chart-card">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <span class="text-muted small">Daily volume of created and completed complaints</span>
                <div class="trend-range" role="group" aria-label="Trend duration range">
                  <button
                    type="button"
                    class="range-btn"
                    :aria-pressed="trendDays === 7 ? 'true' : 'false'"
                    @click="setTrendRange(7)"
                  >
                    7 days
                  </button>
                  <button
                    type="button"
                    class="range-btn"
                    :aria-pressed="trendDays === 14 ? 'true' : 'false'"
                    @click="setTrendRange(14)"
                  >
                    14 days
                  </button>
                  <button
                    type="button"
                    class="range-btn"
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
  min-width: 0;
}
.admin-dashboard__chart-card :deep(.card-header) {
  padding: var(--ns-space-24) var(--ns-space-24) 0;
  border-bottom: 0;
  font-size: var(--ns-type-card-title-size);
}
.admin-dashboard__chart-card :deep(.card-body) {
  padding: var(--ns-space-12) var(--ns-space-24) var(--ns-space-24);
  min-width: 0;
}
.admin-dashboard__state {
  padding: var(--ns-space-24);
  margin-bottom: var(--ns-space-24);
  background-color: var(--ns-surface);
  border: 1px solid var(--ns-border-default);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
}
.admin-dashboard__state :deep(.alert) {
  margin-bottom: 0;
}
@media (max-width: 575.98px) {
  .admin-dashboard__chart-card :deep(.card-header) {
    padding-inline: var(--ns-space-16);
  }
  .admin-dashboard__chart-card :deep(.card-body) {
    padding-inline: var(--ns-space-16);
  }
}

.refresh-btn {
  min-height: 44px;
  min-width: 44px;
}

.trend-range {
  display: inline-flex;
  gap: var(--ns-space-4);
  padding: var(--ns-space-4);
  background: var(--ns-surface-2);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-md);
}

.range-btn {
  min-height: 44px;
  min-width: 64px;
  padding: 0 var(--ns-space-8);
  border: 1px solid transparent;
  border-radius: var(--ns-radius-sm);
  background: transparent;
  color: var(--ns-slate);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.range-btn:hover {
  background: var(--ns-info-bg);
  color: var(--ns-harbour);
}

.range-btn[aria-pressed='true'] {
  background: var(--ns-paper);
  color: var(--ns-harbour);
  border-color: var(--ns-line);
  box-shadow: var(--ns-shadow-xs);
  font-weight: 600;
}

.range-btn:focus-visible {
  outline: var(--ns-focus-ring);
  outline-offset: var(--ns-focus-ring-offset);
}

.admin-dashboard__empty {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  padding: var(--ns-space-24);
  box-shadow: var(--ns-shadow-card);
}
</style>
