<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { fetchAdminComplaints, fetchStats, fetchTrends } from '../api/adminApi'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import ChartCard from '../components/admin/ChartCard.vue'
import DashboardHero from '../components/admin/DashboardHero.vue'
import StatTile from '../components/admin/StatTile.vue'
import AttentionStrip from '../components/admin/AttentionStrip.vue'
import CategoryChart from '../components/admin/CategoryChart.vue'
import ZoneBreakdown from '../components/admin/ZoneBreakdown.vue'
import TrendChart from '../components/admin/TrendChart.vue'
import NeedsAttentionTable from '../components/admin/NeedsAttentionTable.vue'

let auth = null
try {
  auth = useAuthStore()
} catch {
  auth = null
}

// Stats state
const statsLoading = ref(true)
const statsError = ref(null)
const stats = ref(null)
const tiles = computed(() => {
  const totals = stats.value?.totals
  if (!totals) return []
  const percentage = (count) =>
    totals.total > 0 ? `${Math.round((count / totals.total) * 100)}% of total` : ''
  return [
    { label: 'Total', key: 'total', icon: 'dashboard', tone: 'total', query: {}, hint: '' },
    {
      label: 'Submitted',
      key: 'submitted',
      icon: 'tasks',
      tone: 'submitted',
      query: { status: 'Submitted' },
      hint: percentage(totals.submitted),
    },
    {
      label: 'In-Progress',
      key: 'in_progress',
      icon: 'clock',
      tone: 'in-progress',
      query: { status: 'In-Progress' },
      hint: percentage(totals.in_progress),
    },
    {
      label: 'Completed',
      key: 'completed',
      icon: 'history',
      tone: 'completed',
      query: { status: 'Completed' },
      hint: percentage(totals.completed),
    },
    {
      label: 'Overdue',
      key: 'overdue',
      icon: 'clock',
      tone: 'overdue',
      query: { overdue: 'true' },
      attention: totals.overdue > 0,
      hint: totals.overdue > 0 ? 'Needs attention' : 'All clear',
    },
    {
      label: 'Unassigned',
      key: 'unassigned',
      icon: 'users',
      tone: 'unassigned',
      query: { unassigned: 'true' },
      attention: totals.unassigned > 0,
      hint: totals.unassigned > 0 ? 'Needs attention' : 'All clear',
    },
  ]
})

// Trends state
const trendsLoading = ref(true)
const trendsError = ref(null)
const trends = ref([])
const trendDays = ref(14)

// Overdue complaints state (isolated for NeedsAttentionTable)
const overdueLoading = ref(true)
const overdueError = ref(null)
const overdueComplaints = ref([])

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

async function loadOverdueComplaints() {
  overdueLoading.value = true
  overdueError.value = null
  try {
    const result = await fetchAdminComplaints({ overdue: true, pageSize: 4, page: 1 })
    overdueComplaints.value = Array.isArray(result?.items) ? result.items : []
  } catch (err) {
    overdueError.value = err?.message || 'Failed to load overdue complaints.'
  } finally {
    overdueLoading.value = false
  }
}

function handleRefresh() {
  loadStats()
  loadTrends(trendDays.value)
  loadOverdueComplaints()
}

function setTrendRange(days) {
  trendDays.value = days
  loadTrends(days)
}

defineExpose({
  loadStats,
  loadTrends,
  loadOverdueComplaints,
  handleRefresh,
  setTrendRange,
  stats,
  trends,
  overdueComplaints,
  overdueLoading,
  overdueError,
})

onMounted(() => {
  loadStats()
  loadTrends(trendDays.value)
  loadOverdueComplaints()
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
      <!-- 1. Hero Band -->
      <DashboardHero
        :user-name="auth?.user?.name || ''"
        :department-name="stats?.department?.name || auth?.user?.department?.name || ''"
        :open-count="(stats.totals.submitted || 0) + (stats.totals.in_progress || 0)"
        :overdue-count="stats.totals.overdue || 0"
      />

      <!-- 2. Attention Strip Banner -->
      <AttentionStrip
        :overdue="stats.totals.overdue"
        :unassigned="stats.totals.unassigned"
      />

      <!-- 3. Six Stat Tiles in One Row -->
      <div class="admin-dashboard__tiles mb-4">
        <StatTile
          v-for="tile in tiles"
          :key="tile.key"
          :label="tile.label"
          :value="stats.totals[tile.key]"
          :icon="tile.icon"
          :tone="tile.tone"
          :hint="tile.hint"
          :attention="tile.attention"
          :to="{ path: '/admin/complaints', query: tile.query }"
        />
      </div>

      <!-- Empty State -->
      <div v-if="stats.totals.total === 0" class="admin-dashboard__empty mb-4">
        <EmptyState
          title="No complaints yet"
          message="When citizens submit complaints to this department, category and zone breakdowns will appear here."
        />
      </div>

      <template v-else>
        <!-- 4. Chart Row -->
        <div class="admin-dashboard__row admin-dashboard__row--charts mb-4">
          <div class="admin-dashboard__col-trends">
            <ChartCard title="Complaints over time" :subtitle="`Last ${trendDays} days`">
              <template #actions>
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
              </template>

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
            </ChartCard>
          </div>

          <div class="admin-dashboard__col-categories">
            <ChartCard title="By category" subtitle="Complaint volume across service categories">
              <CategoryChart :categories="stats.by_category" />
            </ChartCard>
          </div>
        </div>

        <!-- 5. Bottom Row -->
        <div class="admin-dashboard__row admin-dashboard__row--bottom">
          <div class="admin-dashboard__col-zones">
            <ChartCard title="By zone" subtitle="Distribution across department zones">
              <ZoneBreakdown :zones="stats.by_zone" />
            </ChartCard>
          </div>

          <div class="admin-dashboard__col-attention">
            <ChartCard title="Needs attention" subtitle="Overdue complaints, most urgent first">
              <template #actions>
                <RouterLink
                  :to="{ path: '/admin/complaints', query: { overdue: 'true' } }"
                  class="admin-dashboard__view-all-link"
                >
                  View all complaints
                </RouterLink>
              </template>
              <NeedsAttentionTable
                :items="overdueComplaints"
                :loading="overdueLoading"
                :error="overdueError"
              />
            </ChartCard>
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

.admin-dashboard__state {
  padding: 24px;
  margin-bottom: 24px;
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05);
}

.admin-dashboard__tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 768px) {
  .admin-dashboard__tiles {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1200px) {
  .admin-dashboard__tiles {
    grid-template-columns: repeat(6, 1fr);
  }
}

.admin-dashboard__row {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 992px) {
  .admin-dashboard__row {
    flex-direction: row;
    align-items: stretch;
  }

  .admin-dashboard__col-trends {
    flex: 2;
    min-width: 0;
  }

  .admin-dashboard__col-categories {
    flex: 1;
    min-width: 0;
  }

  .admin-dashboard__col-zones {
    flex: 1;
    min-width: 0;
  }

  .admin-dashboard__col-attention {
    flex: 2;
    min-width: 0;
  }
}

.admin-dashboard__empty {
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05);
}

.admin-dashboard__view-all-link {
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: #0B7285;
  text-decoration: none;
}

.admin-dashboard__view-all-link:hover {
  text-decoration: underline;
  color: #0E4F6B;
}

.admin-dashboard__view-all-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
  border-radius: 4px;
}

.refresh-btn {
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
}

.trend-range {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #F8FAFC;
  border: 1px solid #E3EAF0;
  border-radius: 10px;
}

.range-btn {
  min-height: 36px;
  min-width: 60px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #5B6B7A;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  cursor: pointer;
}

.range-btn:hover {
  background: #E4F1F8;
  color: #0B6E99;
}

.range-btn[aria-pressed='true'] {
  background: #FFFFFF;
  color: #0B6E99;
  border-color: #E3EAF0;
  box-shadow: 0 1px 2px rgba(15, 34, 51, 0.04);
  font-weight: 600;
}

.range-btn:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}
</style>
