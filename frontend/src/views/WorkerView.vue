<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getActivePinia } from 'pinia'
import WorkerHeader from '../components/worker/WorkerHeader.vue'
import TaskSummaryStrip from '../components/worker/TaskSummaryStrip.vue'
import TaskFilterChips from '../components/worker/TaskFilterChips.vue'
import WorkerTaskCard from '../components/worker/WorkerTaskCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import { fetchMyTasks } from '../api/workerApi'
import { getErrorMessage } from '../utils/apiError'
import { isOverdue } from '../utils/taskDisplay'
import { labelOf } from '../utils/labelOf'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  now: {
    type: [Date, Number],
    default: () => Date.now(),
  },
})

const auth = getActivePinia() ? useAuthStore() : null

const workerName = computed(() => auth?.user?.name ?? '')
const headerChip = computed(() => {
  const dept = labelOf(auth?.user?.department)
  const zone = labelOf(auth?.user?.zone)
  if (dept && zone) {
    return `${dept} · ${zone}`
  }
  return ''
})
const workerZone = computed(() => labelOf(auth?.user?.zone))

const items = ref([])
const total = ref(0)
const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const selectedFilter = ref('all')

let requestId = 0
let isMounted = false

// Active tasks only (Completed complaints belong to History)
const activeTasks = computed(() =>
  items.value.filter((t) => t.status !== 'Completed')
)

const filteredTasks = computed(() => {
  if (selectedFilter.value === 'all') {
    return activeTasks.value
  }
  if (selectedFilter.value === 'overdue') {
    return activeTasks.value.filter((t) => isOverdue(t, props.now))
  }
  return activeTasks.value.filter((t) => t.status === selectedFilter.value)
})

async function loadTasks() {
  const currentRequestId = ++requestId
  isLoading.value = true
  error.value = ''

  try {
    const data = await fetchMyTasks()
    if (!isMounted || currentRequestId !== requestId) return

    items.value = data.items
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

onMounted(() => {
  isMounted = true
  loadTasks()
})

onBeforeUnmount(() => {
  isMounted = false
})

defineExpose({
  loadTasks,
  selectedFilter,
  activeTasks,
  filteredTasks,
})
</script>

<template>
  <div class="worker-tasks-page">
    <WorkerHeader
      variant="greeting"
      :name="workerName"
      :chip="headerChip"
    />

    <div class="worker-tasks-body">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm worker-refresh-btn visually-hidden-focusable"
        :disabled="isLoading"
        aria-label="Refresh tasks"
        @click="loadTasks"
      >
        <LoadingSpinner v-if="isLoading" size="sm" label="Refreshing" />
        <span>Refresh</span>
      </button>

      <LoadingSpinner
        v-if="isLoading && !hasLoaded"
        centered
        label="Loading your tasks..."
      />

      <template v-else>
        <ErrorAlert
          v-if="error"
          class="mb-3"
          title="Could not load tasks"
          :message="error"
          show-retry
          @retry="loadTasks"
        />

        <TaskSummaryStrip
          v-if="hasLoaded"
          :tasks="activeTasks"
          :now="now"
          class="worker-tasks-strip"
        />

        <TaskFilterChips
          v-if="activeTasks.length > 0"
          v-model:filter="selectedFilter"
          :tasks="activeTasks"
          :now="now"
          class="worker-tasks-filters"
        />

        <!-- Empty state 1: no active tasks at all -->
        <EmptyState
          v-if="hasLoaded && !error && activeTasks.length === 0"
          title="No tasks right now"
          message="New complaints assigned to you will appear here."
          class="worker-tasks-empty"
        >
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm worker-refresh-btn"
            :disabled="isLoading"
            @click="loadTasks"
          >
            Refresh
          </button>
        </EmptyState>

        <!-- Empty state 2: active tasks exist, but current filter matches 0 -->
        <EmptyState
          v-else-if="hasLoaded && !error && activeTasks.length > 0 && filteredTasks.length === 0"
          title="No tasks in this filter"
          message="Try selecting another filter or view all your tasks."
          class="worker-tasks-empty"
        >
          <button
            type="button"
            class="btn btn-outline-primary btn-sm worker-show-all-btn"
            @click="selectedFilter = 'all'"
          >
            Show all
          </button>
        </EmptyState>

        <!-- Cards list: rendered whenever filteredTasks has items (persists on refresh error) -->
        <ul
          v-if="filteredTasks.length > 0"
          class="list-unstyled d-grid gap-3 mb-0 worker-tasks-list"
        >
          <li v-for="task in filteredTasks" :key="task.id">
            <WorkerTaskCard :task="task" :zone="workerZone" :now="now" />
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.worker-tasks-page {
  /* Bleed header to edges of the layout container */
  margin: calc(-1 * var(--ns-space-16)) calc(-1 * var(--ns-space-16)) 0;
}

.worker-tasks-body {
  padding: 0 var(--ns-space-16);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.worker-tasks-strip {
  margin-top: -26px;
}

.worker-tasks-filters {
  margin-top: 0;
}

.worker-tasks-list {
  margin-top: 0;
}

.worker-refresh-btn {
  min-height: 44px;
}

.worker-show-all-btn {
  min-height: 44px;
  font-weight: 600;
  padding: 0 20px;
}

.worker-tasks-empty {
  background: var(--ns-paper);
  border: 1px solid var(--ns-worker-tab-border);
  border-radius: var(--ns-radius-card);
  box-shadow: 0 1px 3px rgba(14, 34, 51, 0.05);
}
</style>
