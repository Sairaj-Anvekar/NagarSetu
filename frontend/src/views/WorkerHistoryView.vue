<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { fetchMyHistory } from '../api/workerApi'
import { getErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/formatDate'

const items = ref([])
const total = ref(0)
const currentPage = ref(1)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const loadMoreError = ref('')
const failedImageIds = ref({})

let requestId = 0
let isMounted = false

const subtitle = computed(() => {
  if (!hasLoaded.value) {
    return 'Complaints you have completed.'
  }
  return total.value === 1 ? '1 completed task' : `${total.value} completed tasks`
})

const hasMore = computed(() => total.value > items.value.length)

async function loadFirstPage() {
  const currentRequestId = ++requestId
  isLoading.value = true
  isLoadingMore.value = false
  error.value = ''
  loadMoreError.value = ''
  failedImageIds.value = {}

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

function markImageFailed(id) {
  failedImageIds.value = { ...failedImageIds.value, [id]: true }
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
})
</script>

<template>
  <div class="worker-history-page">
    <PageHeader title="History" :subtitle="subtitle" />

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
        v-if="hasLoaded && !error && items.length === 0"
        title="No completed tasks yet"
        message="Tasks you complete will be listed here."
      />

      <ul v-if="items.length > 0" class="list-unstyled d-grid gap-3 mb-0">
        <li v-for="task in items" :key="task.id">
          <article class="worker-history-card">
            <div class="worker-history-card__header d-flex align-items-center justify-content-between gap-2">
              <span class="worker-history-card__tracking">{{ task.tracking_code }}</span>
              <StatusBadge :status="task.status || 'Completed'" />
            </div>

            <div class="worker-history-card__main d-flex align-items-start gap-3">
              <div v-if="task.image_url" class="worker-history-card__thumb">
                <img
                  v-if="!failedImageIds[task.id]"
                  :src="task.image_url"
                  :alt="`${task.category} photo`"
                  class="worker-history-card__thumb-img"
                  @error="markImageFailed(task.id)"
                />
                <div
                  v-else
                  class="worker-history-card__thumb-placeholder"
                  role="img"
                  :aria-label="`${task.category} photo unavailable`"
                >
                  No photo
                </div>
              </div>

              <div class="worker-history-card__body flex-grow-1">
                <h2 class="worker-history-card__category">{{ task.category }}</h2>
                <p v-if="task.description" class="worker-history-card__description">
                  {{ task.description }}
                </p>
              </div>
            </div>

            <div class="worker-history-card__meta">
              <span class="worker-history-card__meta-label">Completed</span>
              <time v-if="task.resolved_at" :datetime="task.resolved_at">
                {{ formatDateTime(task.resolved_at) }}
              </time>
              <span v-else>{{ formatDateTime(task.resolved_at) }}</span>
            </div>
          </article>
        </li>
      </ul>

      <div v-if="hasMore || loadMoreError" class="worker-history-more mt-3">
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
  </div>
</template>

<style scoped>
.worker-history-card {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.worker-history-card__tracking {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ns-ink);
}
.worker-history-card__main,
.worker-history-card__body {
  min-width: 0;
}
.worker-history-card__thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--ns-radius-control);
  overflow: hidden;
  border: 1px solid var(--ns-line);
  background-color: var(--ns-neutral-bg);
}
.worker-history-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.worker-history-card__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 4px;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ns-neutral-fg);
  background-color: var(--ns-neutral-bg);
}
.worker-history-card__category {
  font-family: var(--ns-font-display);
  font-weight: 600;
  font-size: 1.0625rem;
  line-height: 1.4;
  margin: 0 0 4px;
  color: var(--ns-ink);
  overflow-wrap: anywhere;
}
.worker-history-card__description {
  color: var(--ns-slate);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.worker-history-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--ns-slate);
}
.worker-history-card__meta-label {
  font-weight: 600;
  color: var(--ns-ink);
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
