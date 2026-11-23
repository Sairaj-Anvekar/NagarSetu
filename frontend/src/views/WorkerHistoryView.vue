<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WorkerHeader from '../components/worker/WorkerHeader.vue'
import HistorySegmentedControl from '../components/worker/HistorySegmentedControl.vue'
import HistoryTaskCard from '../components/worker/HistoryTaskCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import { fetchMyHistory } from '../api/workerApi'
import { getErrorMessage } from '../utils/apiError'
import { countThisWeek, filterByPeriod, groupCompletedByDay } from '../utils/historyGroups'

const items = ref([])
const total = ref(0)
const currentPage = ref(1)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const loadMoreError = ref('')
const selectedPeriod = ref('week')

let requestId = 0
let isMounted = false

const thisWeekCount = computed(() => countThisWeek(items.value))

const periodFilteredTasks = computed(() => filterByPeriod(items.value, selectedPeriod.value))

const taskGroups = computed(() => groupCompletedByDay(periodFilteredTasks.value))

const hasMore = computed(() => total.value > items.value.length)

async function loadFirstPage() {
  const currentRequestId = ++requestId
  isLoading.value = true
  isLoadingMore.value = false
  error.value = ''
  loadMoreError.value = ''

  try {
    const data = await fetchMyHistory({ page: 1 })
    if (!isMounted || currentRequestId !== requestId) return

    items.value = data.items
    total.value = data.total
    currentPage.value = data.page
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

async function loadMore() {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return

  const currentRequestId = ++requestId
  isLoadingMore.value = true
  loadMoreError.value = ''

  try {
    const data = await fetchMyHistory({ page: currentPage.value + 1 })
    if (!isMounted || currentRequestId !== requestId) return

    const seenIds = new Set(items.value.map((item) => item.id))
    const nextItems = data.items.filter((item) => !seenIds.has(item.id))
    items.value = [...items.value, ...nextItems]
    total.value = data.total
    currentPage.value = data.page
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return

    loadMoreError.value = getErrorMessage(err)
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoadingMore.value = false
    }
  }
}

onMounted(() => {
  isMounted = true
  loadFirstPage()
})

onBeforeUnmount(() => {
  isMounted = false
})

defineExpose({
  loadFirstPage,
  loadMore,
  selectedPeriod,
})
</script>

<template>
  <div class="worker-history-page">
    <WorkerHeader
      variant="title"
      title="History"
      subtitle="Tasks you have completed"
    />

    <main class="worker-history-page__content">
      <div class="worker-history-page__segmented-wrap">
        <HistorySegmentedControl
          v-model="selectedPeriod"
          :week-count="thisWeekCount"
        />
      </div>

      <LoadingSpinner
        v-if="isLoading && !hasLoaded"
        centered
        label="Loading your completed tasks..."
      />

      <template v-else>
        <ErrorAlert
          v-if="error"
          class="mb-3"
          title="Could not load history"
          :message="error"
          show-retry
          @retry="loadFirstPage"
        />

        <EmptyState
          v-else-if="hasLoaded && items.length === 0"
          title="No completed tasks yet"
          message="Tasks you complete will be listed here."
        />

        <EmptyState
          v-else-if="hasLoaded && periodFilteredTasks.length === 0"
          :title="selectedPeriod === 'week' ? 'No completed tasks this week' : 'No completed tasks this month'"
          :message="selectedPeriod === 'week' ? 'Tasks you complete this week will appear here.' : 'Tasks you complete this month will appear here.'"
        />

        <div v-else-if="taskGroups.length > 0" class="worker-history-groups d-flex flex-column gap-4">
          <section
            v-for="group in taskGroups"
            :key="group.dateKey"
            class="worker-history-group"
          >
            <h2 class="worker-history-group__label">{{ group.label }}</h2>
            <div class="d-flex flex-column gap-3">
              <HistoryTaskCard
                v-for="task in group.items"
                :key="task.id"
                :task="task"
              />
            </div>
          </section>
        </div>

        <div v-if="hasMore || loadMoreError" class="worker-history-more mt-4">
          <div
            v-if="loadMoreError"
            class="alert alert-danger d-flex align-items-center justify-content-between gap-2 mb-2"
            role="alert"
          >
            <span>{{ loadMoreError }}</span>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm worker-history-retry-btn"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              Retry
            </button>
          </div>

          <button
            v-if="hasMore"
            type="button"
            class="btn btn-outline-secondary w-100 worker-history-load-more-btn d-inline-flex align-items-center justify-content-center gap-2"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            <LoadingSpinner v-if="isLoadingMore" size="sm" label="Loading more tasks" />
            <span>{{ isLoadingMore ? 'Loading more...' : 'Load more' }}</span>
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.worker-history-page {
  min-height: 100%;
  background-color: var(--ns-worker-page-bg, #f3f6fa);
  padding-bottom: calc(var(--ns-worker-tab-height, 76px) + 24px);
  box-sizing: border-box;
}

.worker-history-page__content {
  padding: 0 16px 24px;
}

.worker-history-page__segmented-wrap {
  margin-top: -26px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.worker-history-group__label {
  font-family: var(--ns-font-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ns-login-text-muted, #4b5b6b);
  margin: 0 0 10px 4px;
}

.worker-history-load-more-btn,
.worker-history-retry-btn {
  min-height: 44px;
  min-width: 44px;
}

.worker-history-load-more-btn:focus-visible,
.worker-history-retry-btn:focus-visible {
  outline: 2px solid var(--ns-span);
  outline-offset: 2px;
}
</style>
